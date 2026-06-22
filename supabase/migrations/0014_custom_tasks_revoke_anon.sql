-- 0014_custom_tasks_revoke_anon.sql — get_custom_tasks() is moderator-only.
-- It already raises 'Not authorized' for non-moderators (and anon has no
-- auth.uid()), but Postgres grants EXECUTE to PUBLIC by default, leaving it on
-- anon's API surface. Strip that so only authenticated moderators can invoke it,
-- matching the project's deny-by-default hardening posture.
revoke execute on function public.get_custom_tasks() from public;
revoke execute on function public.get_custom_tasks() from anon;
grant execute on function public.get_custom_tasks() to authenticated;
