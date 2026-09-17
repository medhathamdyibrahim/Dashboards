-- =====================================================================
-- Deal Tracker — CRM + PO & Invoices Tracker — Supabase Schema
-- =====================================================================
-- Run this whole file once in Supabase SQL Editor (Project > SQL Editor).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE wherever
-- possible. This is the clean, current schema — pipeline is
-- PO -> Sales Order -> Dispatch -> Invoice -> Collections. There is no
-- Quotations or Production stage, and no per-document "line items"
-- sub-tables: every module is one flat row per record, matching the
-- company's own Excel tracking template exactly (see each table's
-- comment below for which sheet/columns it mirrors).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 0. Legacy cleanup — drops tables/objects from an earlier version of
--    this schema (Quotations, Production, per-document line-item
--    tables, file Attachments) if they exist on this database. No-ops
--    on a fresh install. Safe to re-run.
-- ---------------------------------------------------------------------
drop table if exists production_entries cascade;
drop table if exists invoice_items cascade;
drop table if exists dispatch_items cascade;
drop table if exists quotation_items cascade;
drop table if exists quotations cascade;
drop table if exists attachments cascade;
-- NOTE: po_items and so_items are NOT dropped here — they're current,
-- active tables again (PO-optional / SO-mandatory line items), just
-- redesigned from the earlier version. See sections 6b and 7b below.
drop view if exists v_quotation_list;
drop view if exists v_opportunity_selector;
drop view if exists v_hierarchy_report;
drop view if exists v_production_list;
drop view if exists v_invoice_customer;
drop view if exists v_revenue_by_region;
drop view if exists v_revenue_by_customer;
drop view if exists v_product_performance;
drop view if exists v_invoice_aging;
drop view if exists v_monthly_revenue;
drop policy if exists "attachments bucket read" on storage.objects;
drop policy if exists "attachments bucket insert" on storage.objects;
drop policy if exists "attachments bucket delete" on storage.objects;
delete from storage.buckets where id = 'attachments';

-- =====================================================================
-- 1. ROLES & DYNAMIC PERMISSIONS
-- =====================================================================
-- Roles are rows, not a fixed enum, so an Admin can create new roles
-- later from Settings without touching the database.

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text not null,
  is_system boolean not null default false, -- 'admin' is a protected system role
  created_at timestamptz not null default now()
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  module text not null check (module in (
    'customers', 'products', 'purchase_orders',
    'sales_orders', 'dispatches', 'invoices', 'payments', 'settings', 'reports'
  )),
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_approve boolean not null default false,
  unique (role_id, module)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role_id uuid references roles(id) on delete set null,
  is_active boolean not null default true,
  all_regions boolean not null default true, -- true = no Region restriction (default for a fresh account)
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from profiles p
    join roles r on r.id = p.role_id
    where p.id = auth.uid() and r.name = 'admin' and p.is_active
  );
$$;

create or replace function has_permission(p_module text, p_action text)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce((
    select case p_action
      when 'view' then rp.can_view
      when 'create' then rp.can_create
      when 'edit' then rp.can_edit
      when 'delete' then rp.can_delete
      when 'approve' then rp.can_approve
      else false
    end
    from profiles p
    join role_permissions rp on rp.role_id = p.role_id and rp.module = p_module
    where p.id = auth.uid() and p.is_active
  ), false) or is_admin();
$$;

-- =====================================================================
-- 2. REGIONS & PER-USER REGION ACCESS
-- =====================================================================
-- Admin-only screen (Settings -> Regions) assigns each user either
-- all_regions = true (sees everything) or a specific set of Regions in
-- user_regions. A user restricted to a Region cannot see/create/edit/
-- delete ANY Customer, PO, Sales Order, Dispatch, Invoice, or Collection
-- outside their assigned Region(s) — enforced by has_region_access()
-- below, used in the RLS policy on every one of those tables.

create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists user_regions (
  profile_id uuid not null references profiles(id) on delete cascade,
  region text not null references regions(name) on delete cascade,
  primary key (profile_id, region)
);

create or replace function has_region_access(p_region text)
returns boolean language sql stable security definer
set search_path = public as $$
  select is_admin()
    or p_region is null
    or exists (select 1 from profiles p where p.id = auth.uid() and p.all_regions)
    or exists (select 1 from user_regions ur where ur.profile_id = auth.uid() and ur.region = p_region);
$$;

-- =====================================================================
-- 3. CURRENCIES & FX RATES
-- =====================================================================

create table if not exists currencies (
  code text primary key,
  name text not null,
  symbol text not null
);
insert into currencies (code, name, symbol) values
  ('USD', 'US Dollar', '$'),
  ('EGP', 'Egyptian Pound', 'ج.م'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'British Pound', '£'),
  ('SAR', 'Saudi Riyal', 'ر.س'),
  ('AED', 'UAE Dirham', 'د.إ')
on conflict (code) do nothing;

-- Monthly rate per currency: how many units of that currency equal 1
-- USD. Not encrypted — exchange rates aren't sensitive and every report
-- needs to sum/read this table constantly.
create table if not exists fx_rates (
  id uuid primary key default gen_random_uuid(),
  currency_code text not null references currencies(code),
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  rate numeric(14,6) not null check (rate > 0),
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (currency_code, year, month)
);
create index if not exists idx_fx_rates_lookup on fx_rates(currency_code, year, month);

-- =====================================================================
-- 4. CUSTOMER MASTER DATA
-- =====================================================================
-- Matches the "Customer Master Data" sheet exactly: SAP Customer Code |
-- Customer Name | Short Customer Name | Region | Local/Export | Owner.
-- Only users with the 'customers' create/edit permission (Admin-granted,
-- see role_permissions above) can add or change a customer, and only an
-- Admin can add a new Region to the controlled list below (see the
-- RLS policy on `regions`) — a regular editor can only pick an existing
-- Region for a customer, never invent a new one.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  sap_code text unique,
  region text references regions(name) on update cascade,
  local_export text check (local_export in ('Local', 'Export')),
  owner_name text,                              -- free-text "Owner" from the sheet — a report filter, not access control
  account_manager_id uuid references profiles(id) on delete set null, -- optional link to a system user
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_customers_sap_code on customers(sap_code);
create index if not exists idx_customers_region on customers(region);
create index if not exists idx_customers_account_manager on customers(account_manager_id);

-- =====================================================================
-- 5. PRODUCTS (reference catalog — not linked to POs/SOs, which use
--    free-text Item Name / Product Description per the Excel template)
-- =====================================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit text not null default 'piece',
  default_price numeric(14,2) not null default 0,
  default_currency text references currencies(code) default 'USD',
  is_active boolean not null default true,
  proof_number text,
  customer_id uuid references customers(id) on delete set null,
  version text not null default '1',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_products_proof on products(proof_number);
create index if not exists idx_products_customer on products(customer_id);

-- =====================================================================
-- 6. PURCHASE ORDERS — matches the "POs" sheet:
--    Customer Name | PO Number | Item Name | PO Date | PO Quantity | ASP | PO Value
--    A PO can be entered two ways, chosen per-record (is_itemized):
--      - Simple (is_itemized = false): the flat fields below
--        (item_name/po_quantity/asp/po_value) are the source of truth,
--        entered directly — this is what the Excel Import always
--        produces, since the "POs" sheet is one flat row per PO.
--      - Itemized (is_itemized = true): the PO has multiple lines in
--        po_items instead; item_name/po_quantity/asp/po_value on THIS
--        row become a read-only cache (item_name = "<N> items", the
--        other three = sums) kept in sync by a trigger — see section 6b.
-- =====================================================================

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  customer_id uuid not null references customers(id),
  region text,                                  -- denormalized from customers.region, kept in sync by trigger (see section 11)
  currency text not null references currencies(code) default 'USD',
  is_itemized boolean not null default false,
  item_name text,
  po_date date not null default current_date,
  po_quantity text,                              -- encrypted (see encryptedFields.ts) — quantity ordered (sum of po_items if itemized)
  asp text,                                       -- encrypted — average selling price (blank/average if itemized)
  po_value text,                                  -- encrypted — po_quantity * asp (sum of po_items if itemized)
  status text not null default 'open' check (status in ('open', 'quoted', 'closed', 'cancelled')),
  notes text,                                     -- encrypted
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_po_customer on purchase_orders(customer_id);
create index if not exists idx_po_region on purchase_orders(region);
-- Safety net if purchase_orders already existed from an earlier version
-- of this schema (CREATE TABLE IF NOT EXISTS skips adding new columns
-- to a pre-existing table on its own).
alter table purchase_orders add column if not exists is_itemized boolean not null default false;

-- =====================================================================
-- 6b. PO LINE ITEMS — only used when purchase_orders.is_itemized = true.
--     Item Name | Quantity | Price | Value (quantity * price, computed
--     client-side). purchase_orders.po_quantity/asp/po_value/item_name
--     are kept in sync automatically from these rows — see the trigger
--     in section 11b.
-- =====================================================================

create table if not exists po_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  item_name text,
  quantity text,                                 -- encrypted
  price text,                                     -- encrypted
  value text,                                     -- encrypted — quantity * price
  notes text,                                     -- encrypted
  line_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_po_items_po on po_items(po_id);

-- =====================================================================
-- 7. SALES ORDERS — matches the "Sales Orders" sheet:
--    Customer Name | PO Number | SAP SO | Access SO | Product Description
--    | Proof | Ver. | Type | SO Date | SO Quantity | U.Price | SO Value
--    Links directly to a Purchase Order — no Quotation/approval step.
--    Always itemized: product_description/proof_number/version/so_type/
--    unit price all live per-line in so_items (section 7b) — so_quantity
--    and so_value here are a read-only cache (sum of so_items) kept in
--    sync by a trigger, and product_description here is an auto-summary
--    ("<N> items", or the single item's description when there's only
--    one) for fast list display without a join.
-- =====================================================================

create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  so_number text not null unique,
  po_id uuid not null references purchase_orders(id),
  customer_id uuid references customers(id),      -- denormalized from po_id's customer, kept in sync by trigger
  region text,                                     -- denormalized, kept in sync by trigger
  currency text not null references currencies(code) default 'USD',
  sap_so_number text,                              -- "SAP SO"
  factory_so_number text,                          -- "Access SO"
  product_description text,                        -- auto-summary cache, see above
  so_date date not null default current_date,
  so_quantity text,                                -- encrypted — cache, sum of so_items.quantity
  so_value text,                                    -- encrypted — cache, sum of so_items.value
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  notes text,                                       -- encrypted
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_so_po on sales_orders(po_id);
create index if not exists idx_so_customer on sales_orders(customer_id);
create index if not exists idx_so_region on sales_orders(region);
create index if not exists idx_so_sap_number on sales_orders(sap_so_number);
create index if not exists idx_so_factory_number on sales_orders(factory_so_number);
-- Safety net if sales_orders already existed from an earlier version of
-- this schema: those per-item details now live in so_items instead
-- (every SO is itemized — section 7b), so drop them from the header.
alter table sales_orders drop column if exists unit_price;
alter table sales_orders drop column if exists proof_number;
alter table sales_orders drop column if exists version;
alter table sales_orders drop column if exists so_type;

-- =====================================================================
-- 7b. SO LINE ITEMS — every Sales Order has at least one of these.
--     Product Description | Proof | Ver. | Type | Quantity | Price |
--     Value (quantity * price, computed client-side) | Note.
-- =====================================================================

create table if not exists so_items (
  id uuid primary key default gen_random_uuid(),
  so_id uuid not null references sales_orders(id) on delete cascade,
  product_description text,
  proof_number text,                               -- "Proof"
  version text,                                     -- "Ver."
  so_type text,                                     -- "Type"
  quantity text,                                    -- encrypted
  price text,                                       -- encrypted
  value text,                                        -- encrypted — quantity * price
  notes text,                                        -- encrypted
  line_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_so_items_so on so_items(so_id);

-- =====================================================================
-- 8. DISPATCHES — matches the "Dispatches" sheet:
--    Customer Name | Dispatch Number | SAP SO | Access SO | PO Number |
--    Dispatch Quantity | Dispatch Date | AWB/Tracking | Delivery Status
--    | Delivery Date
-- =====================================================================

create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_number text not null unique,
  so_id uuid not null references sales_orders(id),
  po_id uuid references purchase_orders(id),        -- denormalized, kept in sync by trigger
  customer_id uuid references customers(id),         -- denormalized, kept in sync by trigger
  region text,                                        -- denormalized, kept in sync by trigger
  dispatch_quantity text,                             -- encrypted
  dispatch_date date not null default current_date,
  awb_tracking text,
  status text not null default 'draft' check (status in ('draft', 'shipped', 'delivered')), -- "Delivery Status"
  delivery_date date,
  notes text,                                          -- encrypted
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_dispatches_so on dispatches(so_id);
create index if not exists idx_dispatches_customer on dispatches(customer_id);
create index if not exists idx_dispatches_region on dispatches(region);

-- =====================================================================
-- 9. INVOICES — matches the "Invoices" sheet:
--    Customer Name | Invoice Number | Product Description | SAP SO |
--    Access SO | Invoice Quantity | Invoice Value | Invoice Date.
--    Approval workflow (Draft -> Issued -> Partially Paid -> Paid ->
--    Overdue -> Cancelled) is unchanged from the original design.
-- =====================================================================

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  so_id uuid not null references sales_orders(id),
  customer_id uuid references customers(id),          -- denormalized, kept in sync by trigger
  region text,                                          -- denormalized, kept in sync by trigger
  currency text not null references currencies(code) default 'USD',
  product_description text,
  invoice_quantity text,                                -- encrypted
  invoice_value text,                                   -- encrypted
  invoice_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  notes text,                                            -- encrypted
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invoices_so on invoices(so_id);
create index if not exists idx_invoices_customer on invoices(customer_id);
create index if not exists idx_invoices_region on invoices(region);

-- =====================================================================
-- 10. COLLECTIONS (payments) — matches the "Collections" sheet:
--     Customer Name | Invoice Number | Collected Amount | Collection Date
-- =====================================================================

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id),
  customer_id uuid references customers(id),           -- denormalized, kept in sync by trigger
  region text,                                           -- denormalized, kept in sync by trigger
  amount text,                                            -- encrypted — "Collected Amount"
  currency text not null references currencies(code) default 'USD',
  payment_date date not null default current_date,        -- "Collection Date"
  reference_no text,                                        -- encrypted
  notes text,                                                -- encrypted
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
alter table payments drop column if exists method; -- removed: not tracked anywhere in the app anymore
create index if not exists idx_payments_invoice on payments(invoice_id);
create index if not exists idx_payments_customer on payments(customer_id);
create index if not exists idx_payments_region on payments(region);

-- =====================================================================
-- 11. REGION / CUSTOMER_ID DENORMALIZATION TRIGGERS
-- =====================================================================
-- Every downstream table reads its Region and customer_id from its own
-- parent automatically, so the app never has to set them by hand and
-- they can never drift out of sync. If a customer's Region changes,
-- cascade_region_change() ripples the update all the way down to
-- Collections in one go.

create or replace function sync_region_from_customer()
returns trigger language plpgsql as $$
begin
  select region into new.region from customers where id = new.customer_id;
  return new;
end;
$$;

create or replace function sync_so_customer_region()
returns trigger language plpgsql as $$
begin
  select customer_id, region into new.customer_id, new.region from purchase_orders where id = new.po_id;
  return new;
end;
$$;

create or replace function sync_dispatch_customer_region()
returns trigger language plpgsql as $$
begin
  select customer_id, region, po_id into new.customer_id, new.region, new.po_id from sales_orders where id = new.so_id;
  return new;
end;
$$;

create or replace function sync_invoice_customer_region()
returns trigger language plpgsql as $$
begin
  select customer_id, region into new.customer_id, new.region from sales_orders where id = new.so_id;
  return new;
end;
$$;

create or replace function sync_payment_customer_region()
returns trigger language plpgsql as $$
begin
  select customer_id, region into new.customer_id, new.region from invoices where id = new.invoice_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_po_region on purchase_orders;
create trigger trg_sync_po_region before insert or update of customer_id on purchase_orders
  for each row execute function sync_region_from_customer();

drop trigger if exists trg_sync_so_region on sales_orders;
create trigger trg_sync_so_region before insert or update of po_id on sales_orders
  for each row execute function sync_so_customer_region();

drop trigger if exists trg_sync_dispatch_region on dispatches;
create trigger trg_sync_dispatch_region before insert or update of so_id on dispatches
  for each row execute function sync_dispatch_customer_region();

drop trigger if exists trg_sync_invoice_region on invoices;
create trigger trg_sync_invoice_region before insert or update of so_id on invoices
  for each row execute function sync_invoice_customer_region();

drop trigger if exists trg_sync_payment_region on payments;
create trigger trg_sync_payment_region before insert or update of invoice_id on payments
  for each row execute function sync_payment_customer_region();

create or replace function cascade_region_change()
returns trigger language plpgsql as $$
begin
  if new.region is distinct from old.region then
    update purchase_orders set customer_id = customer_id where customer_id = new.id;
    update sales_orders set po_id = po_id where customer_id = new.id;
    update dispatches set so_id = so_id where customer_id = new.id;
    update invoices set so_id = so_id where customer_id = new.id;
    update payments set invoice_id = invoice_id where customer_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cascade_region on customers;
create trigger trg_cascade_region after update of region on customers
  for each row execute function cascade_region_change();

-- ---------------------------------------------------------------------
-- 11b. PO / SO line-item totals.
--      purchase_orders.po_quantity/asp/po_value/item_name and
--      sales_orders.so_quantity/so_value/product_description are kept
--      as an always-current cache of their line items, so every
--      guardrail, list view, dashboard figure, and report that reads
--      the parent row's totals keeps working unchanged whether that
--      PO/SO is itemized or not.
--
--      IMPORTANT: po_items.quantity/price/value and so_items.quantity/
--      price/value are client-side AES ciphertext (see
--      encryptedFields.ts) — Postgres cannot SUM() or otherwise compute
--      on them, for exactly the same reason every other guardrail and
--      total in this app (guardrails.ts, aggregates.ts) runs in the
--      browser instead of in a trigger/view. So this sync is NOT a SQL
--      trigger: it's done in repository/mutations.ts, right after every
--      po_items/so_items write, using the same decrypt-then-sum-in-JS
--      pattern as everywhere else.
-- ---------------------------------------------------------------------

-- =====================================================================
-- 12. updated_at TRIGGERS
-- =====================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['purchase_orders', 'sales_orders', 'dispatches', 'invoices']
  loop
    execute format('drop trigger if exists trg_set_updated_at on %I;', t);
    execute format('create trigger trg_set_updated_at before update on %I
                     for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- =====================================================================
-- 13. SEED: system roles + sensible default permissions
-- =====================================================================
-- Admin always has full access automatically (see has_permission()) and
-- isn't part of role_permissions. These are starting defaults — change
-- anytime from Settings -> Permission Matrix.

insert into roles (name, label, is_system) values ('admin', 'Admin', true)
on conflict (name) do nothing;

insert into roles (name, label, is_system) values
  ('commercial', 'Commercial', false),
  ('procurement', 'Procurement', false),
  ('factory', 'Factory', false),
  ('accounting', 'Accounting', false)
on conflict (name) do nothing;

-- Force the English label on these 5 built-in roles even if they already
-- existed from an earlier version of this schema (which seeded Arabic
-- labels directly) — the Arabic display now comes entirely from the
-- front end's roleLabel() helper (src/lib/translations.ts), keyed off
-- the stable `name` code below, not from this column.
update roles set label = 'Admin' where name = 'admin';
update roles set label = 'Commercial' where name = 'commercial';
update roles set label = 'Procurement' where name = 'procurement';
update roles set label = 'Factory' where name = 'factory';
update roles set label = 'Accounting' where name = 'accounting';

-- Commercial: full CRUD on customers/products/POs/SOs; view-only downstream.
insert into role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
select r.id, m.module, true, true, true, false, false
from roles r cross join (values ('customers'), ('products'), ('purchase_orders'), ('sales_orders')) as m(module)
where r.name = 'commercial'
on conflict (role_id, module) do nothing;
insert into role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
select r.id, m.module, true, false, false, false, false
from roles r cross join (values ('dispatches'), ('invoices'), ('payments'), ('reports')) as m(module)
where r.name = 'commercial'
on conflict (role_id, module) do nothing;

-- Procurement: full CRUD on customers/products/POs; view-only SOs/reports.
insert into role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
select r.id, m.module, true, true, true, false, false
from roles r cross join (values ('customers'), ('products'), ('purchase_orders')) as m(module)
where r.name = 'procurement'
on conflict (role_id, module) do nothing;
insert into role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
select r.id, m.module, true, false, false, false, false
from roles r cross join (values ('sales_orders'), ('reports')) as m(module)
where r.name = 'procurement'
on conflict (role_id, module) do nothing;

-- Factory: full CRUD on dispatches; view-only SOs/reports.
insert into role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
select r.id, 'dispatches', true, true, true, false, false
from roles r where r.name = 'factory'
on conflict (role_id, module) do nothing;
insert into role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
select r.id, m.module, true, false, false, false, false
from roles r cross join (values ('sales_orders'), ('reports')) as m(module)
where r.name = 'factory'
on conflict (role_id, module) do nothing;

-- Accounting: full CRUD + approve on invoices/payments; view-only elsewhere.
insert into role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
select r.id, m.module, true, true, true, false, true
from roles r cross join (values ('invoices'), ('payments')) as m(module)
where r.name = 'accounting'
on conflict (role_id, module) do nothing;
insert into role_permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
select r.id, m.module, true, false, false, false, false
from roles r cross join (values ('customers'), ('products'), ('purchase_orders'), ('sales_orders'), ('dispatches'), ('reports')) as m(module)
where r.name = 'accounting'
on conflict (role_id, module) do nothing;

-- =====================================================================
-- 14. ROW LEVEL SECURITY
-- =====================================================================

alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table profiles enable row level security;
alter table currencies enable row level security;
alter table fx_rates enable row level security;
alter table regions enable row level security;
alter table user_regions enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table purchase_orders enable row level security;
alter table sales_orders enable row level security;
alter table dispatches enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table po_items enable row level security;
alter table so_items enable row level security;

drop policy if exists "read roles" on roles;
create policy "read roles" on roles for select using (auth.uid() is not null);
drop policy if exists "admin manage roles" on roles;
create policy "admin manage roles" on roles for all using (is_admin()) with check (is_admin());

drop policy if exists "read own role permissions" on role_permissions;
create policy "read own role permissions" on role_permissions for select using (auth.uid() is not null);
drop policy if exists "admin manage permissions" on role_permissions;
create policy "admin manage permissions" on role_permissions for all using (is_admin()) with check (is_admin());

drop policy if exists "read profiles" on profiles;
create policy "read profiles" on profiles for select using (auth.uid() is not null);
drop policy if exists "user update own profile" on profiles;
create policy "user update own profile" on profiles for update using (auth.uid() = id);
drop policy if exists "admin manage profiles" on profiles;
create policy "admin manage profiles" on profiles for all using (is_admin()) with check (is_admin());

drop policy if exists "read currencies" on currencies;
create policy "read currencies" on currencies for select using (auth.uid() is not null);
drop policy if exists "admin manage currencies" on currencies;
create policy "admin manage currencies" on currencies for all using (is_admin()) with check (is_admin());

drop policy if exists "fx rates read" on fx_rates;
create policy "fx rates read" on fx_rates for select using (auth.uid() is not null);
drop policy if exists "fx rates admin write" on fx_rates;
create policy "fx rates admin write" on fx_rates for all using (is_admin()) with check (is_admin());

-- Regions: readable by anyone signed in (needed for dropdowns/filters),
-- but only an Admin can add/rename/remove one — this is the control
-- point that keeps the Region list (and therefore access control) from
-- being grown by an ordinary Customer editor.
drop policy if exists "regions read" on regions;
create policy "regions read" on regions for select using (auth.uid() is not null);
drop policy if exists "regions admin write" on regions;
create policy "regions admin write" on regions for all using (is_admin()) with check (is_admin());

drop policy if exists "user_regions read own or admin" on user_regions;
create policy "user_regions read own or admin" on user_regions for select using (profile_id = auth.uid() or is_admin());
drop policy if exists "user_regions admin write" on user_regions;
create policy "user_regions admin write" on user_regions for all using (is_admin()) with check (is_admin());

drop policy if exists "customers select" on customers;
create policy "customers select" on customers for select using (has_permission('customers','view') and has_region_access(region));
drop policy if exists "customers insert" on customers;
create policy "customers insert" on customers for insert with check (has_permission('customers','create') and has_region_access(region));
drop policy if exists "customers update" on customers;
create policy "customers update" on customers for update using (has_permission('customers','edit') and has_region_access(region));
drop policy if exists "customers delete" on customers;
create policy "customers delete" on customers for delete using (has_permission('customers','delete') and has_region_access(region));

drop policy if exists "products select" on products;
create policy "products select" on products for select using (has_permission('products','view'));
drop policy if exists "products insert" on products;
create policy "products insert" on products for insert with check (has_permission('products','create'));
drop policy if exists "products update" on products;
create policy "products update" on products for update using (has_permission('products','edit'));
drop policy if exists "products delete" on products;
create policy "products delete" on products for delete using (has_permission('products','delete'));

drop policy if exists "po select" on purchase_orders;
create policy "po select" on purchase_orders for select using (has_permission('purchase_orders','view') and has_region_access(region));
drop policy if exists "po insert" on purchase_orders;
create policy "po insert" on purchase_orders for insert with check (has_permission('purchase_orders','create') and has_region_access(region));
drop policy if exists "po update" on purchase_orders;
create policy "po update" on purchase_orders for update using (has_permission('purchase_orders','edit') and has_region_access(region));
drop policy if exists "po delete" on purchase_orders;
create policy "po delete" on purchase_orders for delete using (has_permission('purchase_orders','delete') and has_region_access(region));

drop policy if exists "so select" on sales_orders;
create policy "so select" on sales_orders for select using (has_permission('sales_orders','view') and has_region_access(region));
drop policy if exists "so insert" on sales_orders;
create policy "so insert" on sales_orders for insert with check (has_permission('sales_orders','create') and has_region_access(region));
drop policy if exists "so update" on sales_orders;
create policy "so update" on sales_orders for update using (has_permission('sales_orders','edit') and has_region_access(region));
drop policy if exists "so delete" on sales_orders;
create policy "so delete" on sales_orders for delete using (has_permission('sales_orders','delete') and has_region_access(region));

drop policy if exists "dispatches select" on dispatches;
create policy "dispatches select" on dispatches for select using (has_permission('dispatches','view') and has_region_access(region));
drop policy if exists "dispatches insert" on dispatches;
create policy "dispatches insert" on dispatches for insert with check (has_permission('dispatches','create') and has_region_access(region));
drop policy if exists "dispatches update" on dispatches;
create policy "dispatches update" on dispatches for update using (has_permission('dispatches','edit') and has_region_access(region));
drop policy if exists "dispatches delete" on dispatches;
create policy "dispatches delete" on dispatches for delete using (has_permission('dispatches','delete') and has_region_access(region));

drop policy if exists "invoices select" on invoices;
create policy "invoices select" on invoices for select using (has_permission('invoices','view') and has_region_access(region));
drop policy if exists "invoices insert" on invoices;
create policy "invoices insert" on invoices for insert with check (has_permission('invoices','create') and has_region_access(region));
drop policy if exists "invoices update" on invoices;
create policy "invoices update" on invoices for update using (has_permission('invoices','edit') and has_region_access(region));
drop policy if exists "invoices delete" on invoices;
create policy "invoices delete" on invoices for delete using (has_permission('invoices','delete') and has_region_access(region));

drop policy if exists "payments select" on payments;
create policy "payments select" on payments for select using (has_permission('payments','view') and has_region_access(region));
drop policy if exists "payments insert" on payments;
create policy "payments insert" on payments for insert with check (has_permission('payments','create') and has_region_access(region));
drop policy if exists "payments update" on payments;
create policy "payments update" on payments for update using (has_permission('payments','edit') and has_region_access(region));
drop policy if exists "payments delete" on payments;
create policy "payments delete" on payments for delete using (has_permission('payments','delete') and has_region_access(region));

-- PO/SO line items: same permission + Region check as their parent
-- document (managing items is part of creating/editing the PO or SO).
drop policy if exists "po_items select" on po_items;
create policy "po_items select" on po_items for select using (
  has_permission('purchase_orders','view')
  and exists (select 1 from purchase_orders po where po.id = po_items.po_id and has_region_access(po.region))
);
drop policy if exists "po_items write" on po_items;
create policy "po_items write" on po_items for all using (
  (has_permission('purchase_orders','create') or has_permission('purchase_orders','edit'))
  and exists (select 1 from purchase_orders po where po.id = po_items.po_id and has_region_access(po.region))
) with check (
  (has_permission('purchase_orders','create') or has_permission('purchase_orders','edit'))
  and exists (select 1 from purchase_orders po where po.id = po_items.po_id and has_region_access(po.region))
);

drop policy if exists "so_items select" on so_items;
create policy "so_items select" on so_items for select using (
  has_permission('sales_orders','view')
  and exists (select 1 from sales_orders so where so.id = so_items.so_id and has_region_access(so.region))
);
drop policy if exists "so_items write" on so_items;
create policy "so_items write" on so_items for all using (
  (has_permission('sales_orders','create') or has_permission('sales_orders','edit'))
  and exists (select 1 from sales_orders so where so.id = so_items.so_id and has_region_access(so.region))
) with check (
  (has_permission('sales_orders','create') or has_permission('sales_orders','edit'))
  and exists (select 1 from sales_orders so where so.id = so_items.so_id and has_region_access(so.region))
);

-- =====================================================================
-- 15. AUDIT TRAIL & ROLLBACK
-- =====================================================================

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists idx_audit_table_record on audit_log(table_name, record_id);
create index if not exists idx_audit_changed_at on audit_log(changed_at desc);
create index if not exists idx_audit_changed_by on audit_log(changed_by);

create or replace function audit_trigger_fn()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into audit_log(table_name, record_id, action, old_data, new_data, changed_by)
    values (tg_table_name, new.id, 'INSERT', null, to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'UPDATE' then
    insert into audit_log(table_name, record_id, action, old_data, new_data, changed_by)
    values (tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'DELETE' then
    insert into audit_log(table_name, record_id, action, old_data, new_data, changed_by)
    values (tg_table_name, old.id, 'DELETE', to_jsonb(old), null, auth.uid());
    return old;
  end if;
  return null;
end;
$$;

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'customers', 'products', 'purchase_orders', 'sales_orders',
    'dispatches', 'invoices', 'payments', 'fx_rates'
  ] loop
    execute format('drop trigger if exists trg_audit on %I', tbl);
    execute format(
      'create trigger trg_audit after insert or update or delete on %I for each row execute function audit_trigger_fn()',
      tbl
    );
  end loop;
end $$;

alter table audit_log enable row level security;
drop policy if exists "audit log select admin only" on audit_log;
create policy "audit log select admin only" on audit_log for select using (is_admin());

-- =====================================================================
-- 16. Auto-create a profile row whenever a new auth user signs up.
--     First user ever created becomes Admin automatically; everyone
--     after that gets no role until an Admin assigns one.
-- =====================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  admin_role_id uuid;
  existing_profiles int;
begin
  select count(*) into existing_profiles from profiles;
  select id into admin_role_id from roles where name = 'admin';

  insert into profiles (id, email, full_name, role_id, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when existing_profiles = 0 then admin_role_id else null end,
    true
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- 17. LIST VIEWS — denormalized for fast search/filter/sort/pagination.
--     Money/quantity columns are still encrypted, so totals are
--     attached client-side (see src/lib/repository/queries.ts).
-- =====================================================================

create or replace view v_po_list as
select po.id, po.po_number, po.item_name, po.po_date, po.currency, po.status, po.is_itemized, po.created_at,
       po.customer_id, po.region, c.name as customer_name, c.sap_code as customer_sap_code
from purchase_orders po
join customers c on c.id = po.customer_id;

create or replace view v_so_list as
select so.id, so.so_number, so.sap_so_number, so.factory_so_number, so.product_description,
       (select count(*) from so_items i where i.so_id = so.id) as item_count,
       so.so_date, so.currency, so.status, so.created_at,
       so.po_id, po.po_number, so.customer_id, so.region, c.name as customer_name, c.sap_code as customer_sap_code
from sales_orders so
join purchase_orders po on po.id = so.po_id
join customers c on c.id = so.customer_id;

create or replace view v_dispatch_list as
select d.id, d.dispatch_number, d.dispatch_date, d.status, d.awb_tracking, d.delivery_date, d.created_at,
       d.so_id, so.so_number, so.sap_so_number, so.factory_so_number, d.po_id, po.po_number,
       d.customer_id, d.region, c.name as customer_name, c.sap_code as customer_sap_code
from dispatches d
join sales_orders so on so.id = d.so_id
join purchase_orders po on po.id = d.po_id
join customers c on c.id = d.customer_id;

create or replace view v_invoice_list as
select i.id, i.invoice_number, i.product_description, i.invoice_date, i.due_date, i.currency, i.status, i.created_at,
       i.so_id, so.so_number, so.sap_so_number, so.factory_so_number,
       i.customer_id, i.region, c.name as customer_name, c.sap_code as customer_sap_code
from invoices i
join sales_orders so on so.id = i.so_id
join customers c on c.id = i.customer_id;

create or replace view v_collections_list as
select p.id, p.payment_date, p.reference_no, p.created_at,
       p.invoice_id, i.invoice_number,
       p.customer_id, p.region, c.name as customer_name, c.sap_code as customer_sap_code
from payments p
join invoices i on i.id = p.invoice_id
join customers c on c.id = p.customer_id;

-- Per-customer report base (PO -> SO -> Dispatch/Invoice -> Collection),
-- used by the Reports module (search/sort/filter by Region & Owner,
-- date-range on PO/SO/Invoice date, and the per-customer Excel export).
create or replace view v_customer_report as
select
  c.id as customer_id, c.name as customer_name, c.short_name, c.sap_code,
  c.region, c.local_export, c.owner_name, c.account_manager_id,
  am.full_name as account_manager_name,
  po.id as po_id, po.po_number, po.item_name as po_item_name, po.po_date, po.currency as po_currency,
  so.id as so_id, so.so_number, so.sap_so_number, so.factory_so_number,
  so.product_description, so.so_date, so.currency as so_currency,
  d.id as dispatch_id, d.dispatch_number, d.dispatch_date, d.status as dispatch_status,
  d.awb_tracking, d.delivery_date,
  i.id as invoice_id, i.invoice_number, i.invoice_date, i.status as invoice_status, i.currency as invoice_currency,
  pay.id as payment_id, pay.payment_date
from customers c
left join profiles am on am.id = c.account_manager_id
left join purchase_orders po on po.customer_id = c.id
left join sales_orders so on so.po_id = po.id
left join dispatches d on d.so_id = so.id
left join invoices i on i.so_id = so.id
left join payments pay on pay.invoice_id = i.id;

-- PO -> Sales Order -> Dispatch -> Invoice -> Fully Collected funnel.
create or replace view v_sales_funnel as
select 1 as sort_order, 'أوامر شراء (POs)' as stage, count(*) as count from purchase_orders
union all
select 2, 'أوامر بيع (SO)', count(*) from sales_orders
union all
select 3, 'شحنات', count(*) from dispatches
union all
select 4, 'فواتير', count(*) from invoices where status <> 'cancelled'
union all
select 5, 'فواتير محصّلة بالكامل', count(*) from invoices where status = 'paid'
order by sort_order;

-- =====================================================================
-- Done.
-- =====================================================================
