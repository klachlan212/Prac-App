-- 0011_remove_organizations.sql — remove the unused organization / cohort-admin
-- system (organizations, memberships, invitations + their RPCs).
--
-- This subsystem (from 0001/0002) was never used: organizations, memberships and
-- invitations are all empty. Removing it also clears two standing advisories —
-- organizations' RLS-enabled-no-policy, and the anon-executable SECURITY DEFINER
-- functions create_organization / accept_invitation / get_org_adherence.
-- Nothing else depends on these (hospital moderation uses profiles.is_moderator;
-- profiles.cohort/university_id remain as plain profile attributes).

drop function if exists public.accept_invitation(text);
drop function if exists public.create_organization(text, text);
drop function if exists public.get_org_adherence(uuid);

drop table if exists public.invitations cascade;
drop table if exists public.memberships cascade;
drop table if exists public.organizations cascade;
