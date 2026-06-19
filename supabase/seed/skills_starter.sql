-- Starter content for the core loop (spec §5: the skill→ANSAT map is founder
-- content — this is a small, illustrative scaffold to make the loop testable;
-- replace/expand with the authored clinical set). Idempotent.

-- ANSAT 23-item structure (starter labels under the 7 RN standards).
insert into ansat_items (code, standard_id, ordinal, label) values
  ('1.1', 1, 1, 'Accesses, analyses and uses the best available evidence'),
  ('1.2', 1, 2, 'Develops practice through reflection on experiences'),
  ('1.3', 1, 3, 'Respects all cultures and experiences'),
  ('2.1', 2, 1, 'Establishes professional, therapeutic relationships'),
  ('2.2', 2, 2, 'Communicates effectively and is respectful'),
  ('2.3', 2, 3, 'Recognises that people are the experts in their own lives'),
  ('2.4', 2, 4, 'Provides support and directs people to resources'),
  ('3.1', 3, 1, 'Considers and responds to own capabilities'),
  ('3.2', 3, 2, 'Provides nursing care within own scope of practice'),
  ('3.3', 3, 3, 'Uses a lifelong learning approach for practice'),
  ('4.1', 4, 1, 'Conducts assessments that are holistic and culturally appropriate'),
  ('4.2', 4, 2, 'Works in partnership to determine factors that affect health'),
  ('4.3', 4, 3, 'Assesses the risks that inform safe practice'),
  ('5.1', 5, 1, 'Uses assessment data to develop a plan'),
  ('5.2', 5, 2, 'Plans and negotiates priorities for care'),
  ('5.3', 5, 3, 'Documents a plan that is clear and goal-directed'),
  ('6.1', 6, 1, 'Provides comprehensive, safe and responsive care'),
  ('6.2', 6, 2, 'Practises within relevant policies and guidelines'),
  ('6.3', 6, 3, 'Administers interventions and medications safely'),
  ('6.4', 6, 4, 'Recognises and responds to deterioration'),
  ('7.1', 7, 1, 'Evaluates outcomes against the plan'),
  ('7.2', 7, 2, 'Revises the plan based on evaluation'),
  ('7.3', 7, 3, 'Determines, documents and communicates further priorities')
on conflict (code) do nothing;

-- Starter skill library (med-surg / aged-care first placement, per spec §6).
insert into skill_library (name, category, track) values
  ('De-escalation with a distressed patient', 'Communication', 'RN'),
  ('Therapeutic communication',                'Communication', 'RN'),
  ('Person-centred care planning',             'Care planning', 'RN'),
  ('Basic wound care',                         'Clinical skills', 'RN'),
  ('Complex wound care & dressing',            'Clinical skills', 'RN'),
  ('Wound assessment',                         'Assessment', 'RN'),
  ('Continuous cardiac monitoring (telemetry)','Clinical skills', 'RN'),
  ('Applying a 12-lead ECG',                   'Clinical skills', 'RN'),
  ('Fluid balance & daily weights',            'Clinical skills', 'RN'),
  ('Recognising deterioration',                'Critical thinking', 'RN'),
  ('Medication administration',                'Medication', 'RN'),
  ('ISBAR handover',                           'Communication', 'RN')
on conflict (name, track) do nothing;

-- skill → ANSAT map (starter). Looked up by name so it is stable across runs.
insert into skill_ansat_map (skill_id, standard_id, item_code)
select s.id, m.standard_id, m.item_code
from (values
  ('De-escalation with a distressed patient', 2, '2.2'),
  ('Therapeutic communication',                2, '2.1'),
  ('Person-centred care planning',             5, '5.1'),
  ('Person-centred care planning',             4, '4.2'),
  ('Basic wound care',                         4, '4.1'),
  ('Complex wound care & dressing',            4, '4.1'),
  ('Wound assessment',                         4, '4.2'),
  ('Wound assessment',                         1, '1.1'),
  ('Continuous cardiac monitoring (telemetry)',4, '4.2'),
  ('Applying a 12-lead ECG',                   4, '4.2'),
  ('Fluid balance & daily weights',            4, '4.3'),
  ('Recognising deterioration',                1, '1.1'),
  ('Recognising deterioration',                6, '6.4'),
  ('Medication administration',                6, '6.3'),
  ('ISBAR handover',                           2, '2.2'),
  ('ISBAR handover',                           7, '7.3')
) as m(skill_name, standard_id, item_code)
join skill_library s on s.name = m.skill_name and s.track = 'RN'
on conflict (skill_id, standard_id) do nothing;
