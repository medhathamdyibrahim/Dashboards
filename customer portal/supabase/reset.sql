-- =====================================================================
-- RESET SCRIPT — DANGER: IRREVERSIBLE
-- =====================================================================
-- Wipes every application table, view, function, and trigger in the
-- `public` schema (all your business data: customers, purchase orders,
-- sales orders, dispatches, invoices, payments, audit log, everything).
-- Run this ONCE in the Supabase SQL Editor, then run the full
-- schema.sql immediately after to recreate everything fresh.
--
-- WHAT THIS DOES NOT TOUCH (safe):
--   - auth.users (your login accounts / Supabase Auth) — untouched.
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> paste
-- this whole file -> Run. Then paste schema.sql in a new query and run
-- that too.
-- =====================================================================

drop schema public cascade;
create schema public;

-- Supabase's API layer (PostgREST) and the anon/authenticated/service_role
-- roles need these standard grants re-applied after recreating the schema
-- from scratch — schema.sql's own RLS policies still fully control which
-- actual ROWS each role can see/change, this just restores the baseline
-- schema-level access Supabase expects to exist.
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;

-- =====================================================================
-- Done. Now run the full supabase/schema.sql file to rebuild everything.
-- =====================================================================
