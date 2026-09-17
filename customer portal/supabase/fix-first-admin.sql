-- Run this ONCE to manually promote a user to Admin when nobody has the
-- admin role yet (e.g. the automatic "first user = admin" trigger didn't
-- apply because a leftover profile already existed).

-- Step 1 — sanity check: see everyone currently in the system and their role.
select p.id, p.email, p.full_name, p.role_id, r.name as role_name
from profiles p
left join roles r on r.id = p.role_id
order by p.email;

-- Step 2 — replace the email below with YOUR account's email, then run this.
update profiles
set role_id = (select id from roles where name = 'admin')
where email = 'YOUR-EMAIL-HERE@example.com';

-- Step 3 — confirm it worked.
select p.email, r.name as role_name
from profiles p
join roles r on r.id = p.role_id
where p.email = 'YOUR-EMAIL-HERE@example.com';
