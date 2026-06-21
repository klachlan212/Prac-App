-- 0009_set_updated_at_search_path.sql — final mutable-search_path cleanup (audit M3).
--
-- Pin `search_path = ''` on set_updated_at, the last function still flagged by
-- function_search_path_mutable. Body is unchanged (now() is a pg_catalog built-in,
-- so no qualification is needed), and CREATE OR REPLACE leaves the existing
-- updated_at triggers (hospital_requests, hospital_tips, memberships,
-- organizations, placements, profiles, reflections) intact.
create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
