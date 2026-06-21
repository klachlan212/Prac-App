-- 0006_hospital_state.sql — add an Australian state/territory to each hospital so
-- the directory can filter by state and group each state into its capital city vs
-- "<STATE> Regional/Rural/Remote" (e.g. Geelong → "VIC Regional/Rural/Remote").
-- Additive; existing seeded rows are all Victorian, so backfill to VIC then lock
-- the column down with a check constraint. Reads stay world-readable (0004);
-- moderator writes (0005) now carry the new column.

alter table hospitals add column if not exists state text;
update hospitals set state = 'VIC' where state is null;
alter table hospitals alter column state set not null;

alter table hospitals drop constraint if exists hospitals_state_check;
alter table hospitals add constraint hospitals_state_check
  check (state in ('NSW','VIC','QLD','WA','SA','TAS','NT','ACT'));
