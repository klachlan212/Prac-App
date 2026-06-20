-- 0005_hospital_moderation_writes.sql — let global moderators manage the hospital
-- roster and official reference cards from the in-app /admin queue. Reads stay
-- world-readable; writes are gated on profiles.is_moderator via the same inline
-- subquery used for tip moderation (no exposed function). Hospitals can be added
-- and edited (no delete policy → deletes denied, since removing a hospital would
-- cascade its community tips). Reference cards are fully managed.

drop policy if exists "hospitals: moderators insert" on hospitals;
create policy "hospitals: moderators insert" on hospitals
  for insert with check (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );
drop policy if exists "hospitals: moderators update" on hospitals;
create policy "hospitals: moderators update" on hospitals
  for update using (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  ) with check (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );

drop policy if exists "hospital reference cards: moderators insert" on hospital_reference_cards;
create policy "hospital reference cards: moderators insert" on hospital_reference_cards
  for insert with check (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );
drop policy if exists "hospital reference cards: moderators update" on hospital_reference_cards;
create policy "hospital reference cards: moderators update" on hospital_reference_cards
  for update using (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  ) with check (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );
drop policy if exists "hospital reference cards: moderators delete" on hospital_reference_cards;
create policy "hospital reference cards: moderators delete" on hospital_reference_cards
  for delete using (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );
