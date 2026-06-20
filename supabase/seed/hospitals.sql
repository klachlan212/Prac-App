-- Seed: Hospital Directory — Melbourne metro + University Hospital Geelong.
-- Royal Melbourne is fully seeded to demonstrate all layout states; the others
-- launch sparse. Idempotent: safe to run more than once.

insert into hospitals (id, name, location, region, intro) values
  ('royal-melbourne', 'The Royal Melbourne Hospital', 'Parkville, VIC', 'Melbourne',
   'Big, busy, and a lot to take in on day one. Here’s the practical stuff — where to park, how to get in, where to eat — so your first shift is one less thing to dread.'),
  ('the-alfred', 'The Alfred', 'Melbourne (Prahran), VIC', 'Melbourne',
   'A major trauma hospital on Commercial Rd. The logistics that trip up new students on day one, sorted.'),
  ('st-vincents-melbourne', 'St Vincent’s Hospital Melbourne', 'Fitzroy, VIC', 'Melbourne',
   'Inner-city and tight on space. The practical know-how for getting in and getting fed.'),
  ('austin', 'Austin Hospital', 'Heidelberg, VIC', 'Melbourne',
   'Out in Heidelberg with its own rhythm. Parking, transport and the day-one essentials.'),
  ('monash-medical-centre', 'Monash Medical Centre', 'Clayton, VIC', 'Melbourne',
   'Clayton’s big tertiary hub. The getting-there-and-settling-in basics.'),
  ('university-hospital-geelong', 'University Hospital Geelong', 'Geelong, VIC (Barwon Health)', 'Geelong',
   'Barwon Health’s main site. Parking and transport from someone who’s done the drive.')
on conflict (id) do nothing;

-- Reference cards (official sources) — guarded so re-runs don’t duplicate.
do $$
begin
  if not exists (select 1 from hospital_reference_cards) then
    insert into hospital_reference_cards (hospital_id, category, text, source_url, source_label) values
      ('royal-melbourne', 'Transit',
       'Official parking rates, permits and validation — current rates and how to apply for a multi-entry permit.',
       'https://www.thermh.org.au/patients-visitors/getting-here', 'thermh.org.au'),
      ('royal-melbourne', 'WardLogistics',
       'Student placement orientation — ID, swipe access and your first-day checklist.',
       'https://www.thermh.org.au/health-professionals/students', 'RMH · Students'),
      ('royal-melbourne', 'WardLogistics',
       'After-hours entry and security escort — how to enter and move safely outside business hours.',
       'https://www.thermh.org.au/patients-visitors/getting-here', 'RMH · Security'),
      ('royal-melbourne', 'WardLogistics',
       'Lost or faulty ID/swipe replacement — where to go and what to bring.',
       'https://www.thermh.org.au/health-professionals/students', 'RMH · Access office');
  end if;
end $$;

-- Published tips — guarded so re-runs don’t duplicate.
do $$
begin
  if not exists (select 1 from hospital_tips) then
    insert into hospital_tips
      (hospital_id, category, text, upvotes, downvotes, verification_date,
       submitted_by, submitted_at, verified_by, confidence_level, status, is_published) values
      -- Royal Melbourne · Transit (populate, incl. one stale tip)
      ('royal-melbourne', 'Transit',
       'The hospital car park is off Flemington Rd — casual rates add up fast over a full shift. If you’re here for weeks, ask the car park office about a discounted multi-entry staff/student permit before you start paying daily.',
       28, 1, '2026-06-12', 'Lachlan', '2026-06-12', 'Lachlan', 'High', 'published', true),
      ('royal-melbourne', 'Transit',
       'Trams 19, 57 and 59 all stop near the Royal Parade / Flemington Rd corner — a 5–7 min walk to the main entrance. Cheaper than parking and you skip the morning boom-gate queue.',
       19, 0, '2026-05-30', '2nd-year student', '2026-05-30', null, 'Medium', 'published', true),
      ('royal-melbourne', 'Transit',
       'If you finish after the trams thin out, the night network bus runs along Royal Parade. Check the PTV app the night before — times shift on weekends.',
       8, 1, '2026-04-18', '3rd-year student', '2026-04-18', null, 'Low', 'published', true),
      ('royal-melbourne', 'Transit',
       'Early-bird parking at the Melbourne Uni car parks on Grattan St can work out cheaper if you’re in before 8am and out by evening.',
       14, 3, '2025-11-05', 'Student', '2025-11-05', null, 'Medium', 'published', true),
      -- Royal Melbourne · Ward logistics (hybrid with reference cards)
      ('royal-melbourne', 'WardLogistics',
       'Sort your hospital ID/swipe on day one — the access & ID office is in the main building; bring your student ID and placement letter. Without a swipe you’ll be buzzing for every door.',
       22, 0, '2026-06-08', 'Lachlan', '2026-06-08', 'Lachlan', 'High', 'published', true),
      ('royal-melbourne', 'WardLogistics',
       'Student lockers are limited and fill fast — bring a padlock and claim one early, or use the change-room cubbies for valuables.',
       11, 1, '2026-05-12', 'Student', '2026-05-12', null, 'Medium', 'published', true),
      -- Royal Melbourne · Shift fuel (populate)
      ('royal-melbourne', 'ShiftFuel',
       'The staff cafeteria does a cheap early breakfast before 7am — handy if you skipped it. Hot food winds down mid-afternoon, so grab lunch before 2pm on a late.',
       17, 0, '2026-06-10', 'Lachlan', '2026-06-10', 'Lachlan', 'High', 'published', true),
      ('royal-melbourne', 'ShiftFuel',
       'There’s a 24h vending bank near the main lifts and a microwave in most ward tea rooms — bring leftovers, the nearby cafés don’t open till 7.',
       9, 0, '2026-05-20', 'EN student', '2026-05-20', null, 'Medium', 'published', true),
      ('royal-melbourne', 'ShiftFuel',
       'Lygon St is a 10-min walk for a proper coffee on a break; for a quick one the foyer kiosk opens around 6:30am.',
       6, 1, '2026-04-30', 'Student', '2026-04-30', null, 'Low', 'published', true),
      -- The Alfred
      ('the-alfred', 'Transit',
       'The Alfred is right on Commercial Rd — the 72 tram and the Sandringham line (Prahran/Windsor) both drop you within a few minutes’ walk. Parking on-site is limited and pricey.',
       12, 0, '2026-06-02', '3rd-year student', '2026-06-02', null, 'Medium', 'published', true),
      ('the-alfred', 'ShiftFuel',
       'Chapel St is two minutes away for food but adds up; the staff cafeteria and a 24h vending area cover night shifts.',
       7, 0, '2026-05-22', 'Student', '2026-05-22', null, 'Low', 'published', true),
      -- University Hospital Geelong
      ('university-hospital-geelong', 'Transit',
       'Street parking around Ryrie St / Bellerine St fills early; the hospital decks are easiest but check the daily cap. Geelong station is a 15-min walk or a short bus.',
       9, 0, '2026-06-01', '2nd-year student', '2026-06-01', null, 'Medium', 'published', true);
  end if;
end $$;

-- Flag the founder as the global moderator (no-op if the account isn’t present).
update profiles set is_moderator = true
  where id in (select id from auth.users where lower(email) = 'klachlan212@gmail.com');
