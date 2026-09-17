-- One-time backfill: creates a `profiles` row for every existing
-- auth.users account that doesn't have one yet (this happens when an
-- account was created BEFORE the on_auth_user_created trigger existed,
-- or before a `reset.sql` wiped the public schema without touching
-- auth.users). The very first backfilled profile becomes Admin
-- automatically, matching the normal "first user = admin" rule; anyone
-- else backfilled gets no role, same as the regular trigger does.

insert into profiles (id, email, full_name, role_id, is_active)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  case
    when not exists (select 1 from profiles) and row_number() over (order by u.created_at) = 1
      then (select id from roles where name = 'admin')
    else null
  end,
  true
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

-- Confirm it worked — should show your account with role_name = 'admin'.
select p.email, p.role_id, r.name as role_name
from profiles p
left join roles r on r.id = p.role_id
order by p.email;
