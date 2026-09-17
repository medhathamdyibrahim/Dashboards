-- Diagnostic queries — run each one and share the results (screenshot or
-- paste the output rows), so we can see exactly what's in the database
-- instead of guessing.

-- 1) Does the 'admin' role actually exist? (If this returns 0 rows, the
--    roles table wasn't seeded properly and that's the real problem.)
select * from roles;

-- 2) Every profile currently in the system, with their role name.
select p.id, p.email, p.full_name, p.role_id, p.is_active, r.name as role_name
from profiles p
left join roles r on r.id = p.role_id
order by p.email;

-- 3) Every login account in Supabase Auth (separate from profiles table).
--    Compares against #2 above — every row here should have a matching
--    row in profiles. If not, that account has no profile at all.
select id, email, created_at from auth.users order by created_at;
