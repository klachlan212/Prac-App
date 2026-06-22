-- 0013_skills_taxonomy.sql — the real skills taxonomy (founder content), placement
-- context tagging, custom-task capture, and a moderator custom-task report.
--
-- Adds:
--   placements.context        — one of 8 placement-context tags (null = general)
--   skill_library.contexts    — text[] of context tags a skill applies to (null = all)
--   skills_logged.custom      — true for a student-authored "can't find it" task
--   skills_logged.nmba_standard — the standard a custom task was mapped to
-- Seeds the master skills taxonomy (each task → its NMBA standard + contexts).
-- Adds get_custom_tasks() — moderator-only aggregate of custom tasks (name,
-- standard, count) so high-frequency customs can be promoted to the master list.

alter table placements    add column if not exists context text;
alter table skill_library add column if not exists contexts text[];
alter table skills_logged add column if not exists custom boolean not null default false;
alter table skills_logged add column if not exists nmba_standard smallint;

-- ── Master skills taxonomy ──────────────────────────────────────────────────
with taxonomy(name, standard_id, contexts) as (values
  -- Standard 1 — Thinks critically and analyses nursing practice
  ('Clinical reasoning / prioritising patient care', 1, null::text[]),
  ('Evidence-based decision making', 1, null),
  ('Recognising and responding to deterioration (Between the Flags / MET)', 1, array['Medical/Surgical','Emergency','Perioperative','Paediatric','Rehabilitation/Sub-acute']),
  ('Incident identification and reporting', 1, null),
  ('Medication error identification', 1, null),
  -- Standard 2 — Engages in therapeutic and professional relationships
  ('Therapeutic communication with patient', 2, null),
  ('Breaking bad news / difficult conversations', 2, array['Medical/Surgical','Emergency','Aged Care','Mental Health','Paediatric','Rehabilitation/Sub-acute']),
  ('Working with family members or carers', 2, null),
  ('Consent and capacity conversations', 2, null),
  ('Cultural safety in care delivery', 2, null),
  ('Care of a patient with cognitive impairment', 2, array['Medical/Surgical','Aged Care','Mental Health','Rehabilitation/Sub-acute']),
  ('End of life communication', 2, array['Medical/Surgical','Aged Care','Community/Primary Care','Paediatric']),
  -- Standard 3 — Maintains the capability for practice
  ('Receiving supervision / feedback from RN or preceptor', 3, null),
  ('Providing feedback to peers', 3, null),
  ('Professional boundary management', 3, null),
  -- Standard 4 — Comprehensively conducts assessments
  ('Head-to-toe physical assessment', 4, array['Medical/Surgical','Emergency','Perioperative','Paediatric','Rehabilitation/Sub-acute']),
  ('Neurological assessment', 4, array['Medical/Surgical','Emergency','Rehabilitation/Sub-acute','Paediatric']),
  ('Respiratory assessment', 4, array['Medical/Surgical','Emergency','Perioperative','Paediatric','Aged Care']),
  ('Cardiovascular assessment', 4, array['Medical/Surgical','Emergency','Perioperative','Paediatric','Rehabilitation/Sub-acute']),
  ('Pain assessment', 4, null),
  ('Skin integrity assessment', 4, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute','Community/Primary Care']),
  ('Nutritional assessment', 4, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute','Community/Primary Care']),
  ('Falls risk assessment', 4, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute','Mental Health','Community/Primary Care']),
  ('Mental health assessment', 4, array['Mental Health','Emergency','Community/Primary Care']),
  ('Pressure injury assessment', 4, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute','Perioperative']),
  ('Fluid balance assessment', 4, array['Medical/Surgical','Emergency','Perioperative','Paediatric']),
  -- Standard 5 — Develops a plan for nursing practice
  ('Care plan development', 5, null),
  ('Goal setting with patient', 5, null),
  ('Discharge planning', 5, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute','Community/Primary Care']),
  ('Escalation planning', 5, array['Medical/Surgical','Emergency','Aged Care','Perioperative']),
  ('Multidisciplinary team handover (ISBAR)', 5, null),
  ('Referral to allied health', 5, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute','Community/Primary Care','Mental Health']),
  -- Standard 6 — Provides safe, appropriate and responsive quality nursing practice
  ('Medication administration (oral)', 6, null),
  ('Medication administration (IV)', 6, array['Medical/Surgical','Emergency','Perioperative','Paediatric']),
  ('IV cannulation', 6, array['Medical/Surgical','Emergency','Perioperative','Paediatric']),
  ('Blood collection / venepuncture', 6, array['Medical/Surgical','Emergency','Community/Primary Care','Paediatric']),
  ('Blood transfusion administration', 6, array['Medical/Surgical','Emergency','Perioperative']),
  ('NGT insertion / feeding tube care', 6, array['Medical/Surgical','Emergency','Paediatric','Aged Care']),
  ('Urinary catheter insertion', 6, array['Medical/Surgical','Emergency','Perioperative','Rehabilitation/Sub-acute']),
  ('Wound dressing / wound care', 6, null),
  ('Surgical wound care', 6, array['Medical/Surgical','Perioperative','Emergency']),
  ('Drain tube management', 6, array['Medical/Surgical','Perioperative']),
  ('Chest drain observation', 6, array['Medical/Surgical','Emergency','Perioperative']),
  ('Oxygen therapy', 6, array['Medical/Surgical','Emergency','Perioperative','Paediatric','Aged Care','Rehabilitation/Sub-acute']),
  ('Nebuliser administration', 6, array['Medical/Surgical','Emergency','Paediatric','Aged Care','Community/Primary Care']),
  ('ECG recording', 6, array['Medical/Surgical','Emergency','Perioperative','Rehabilitation/Sub-acute']),
  ('Blood glucose monitoring (BSL)', 6, null),
  ('Vital signs', 6, null),
  ('Manual handling / patient positioning', 6, null),
  ('Pressure injury prevention', 6, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute','Perioperative']),
  ('Infection control / aseptic technique', 6, null),
  ('Isolation precautions', 6, array['Medical/Surgical','Emergency','Aged Care','Paediatric']),
  ('Tracheostomy care', 6, array['Medical/Surgical','Emergency','Perioperative','Paediatric']),
  ('Suctioning', 6, array['Medical/Surgical','Emergency','Perioperative','Paediatric']),
  ('PEG / enteral feeding', 6, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute','Community/Primary Care']),
  ('Continence care / catheter care', 6, array['Medical/Surgical','Aged Care','Rehabilitation/Sub-acute']),
  ('Stoma care', 6, array['Medical/Surgical','Community/Primary Care','Rehabilitation/Sub-acute']),
  ('Pre-operative care', 6, array['Perioperative','Medical/Surgical']),
  ('Post-operative care', 6, array['Perioperative','Medical/Surgical']),
  ('Medication calculation', 6, null),
  ('S8 medication management', 6, array['Medical/Surgical','Emergency','Aged Care','Perioperative','Community/Primary Care']),
  ('Subcutaneous / IM injection', 6, null),
  ('Central line observation / care', 6, array['Medical/Surgical','Emergency','Perioperative','Paediatric']),
  ('Epidural observation', 6, array['Perioperative','Medical/Surgical']),
  ('Palliative care / comfort measures', 6, array['Medical/Surgical','Aged Care','Community/Primary Care','Rehabilitation/Sub-acute']),
  ('Restraint application / documentation', 6, array['Mental Health','Aged Care','Emergency']),
  ('Resuscitation / CPR', 6, null),
  ('Defibrillation', 6, array['Medical/Surgical','Emergency','Perioperative']),
  ('Emergency response', 6, null),
  -- Standard 7 — Evaluates outcomes to inform nursing practice
  ('Outcome documentation / nursing notes', 7, null),
  ('Handover delivery (ISBAR)', 7, null),
  ('Evaluation of care plan effectiveness', 7, null),
  ('Medication review participation', 7, array['Medical/Surgical','Aged Care','Community/Primary Care','Rehabilitation/Sub-acute']),
  ('Ward round participation', 7, array['Medical/Surgical','Rehabilitation/Sub-acute','Paediatric']),
  ('Identifying care that did not go to plan', 7, null)
),
ins as (
  insert into skill_library (name, track, contexts)
  select name, 'RN', contexts from taxonomy
  on conflict (name, track) do update set contexts = excluded.contexts
  returning id, name
)
insert into skill_ansat_map (skill_id, standard_id)
select i.id, t.standard_id
from taxonomy t join ins i on i.name = t.name
on conflict (skill_id, standard_id) do nothing;

-- ── Custom-task report (moderator-only, aggregate; no per-user data) ─────────
create or replace function public.get_custom_tasks()
returns table (name text, nmba_standard smallint, uses bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false) then
    raise exception 'Not authorized';
  end if;
  return query
    select sl.raw_text as name, sl.nmba_standard, count(*) as uses
    from public.skills_logged sl
    where sl.custom = true and sl.raw_text is not null
    group by sl.raw_text, sl.nmba_standard
    order by count(*) desc, sl.raw_text;
end;
$$;
grant execute on function public.get_custom_tasks() to authenticated;
