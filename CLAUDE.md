# Prac. — Build Spec for Claude Code

_Authored 19 Jun 2026 · solo RN founder · single source of truth for the v1 build_

This document is the build brief. It tells you **what to build and why** — the *why* matters because several decisions are deliberately counter-intuitive and a locally-sensible "improvement" will break the model. When in doubt, preserve the rationale, not the convenience.

The **product spec is §§0–8 below**; **Appendix A** is the engineering & deploy contract (how to build/ship without breaking). **Both are binding.** Where a casual instruction conflicts with this file, this file wins until deliberately changed.

Companion artifacts: interactive onboarding prototype (HTML, links held by founder). The prototype shows *what the first-run screens look and feel like*; this spec governs *everything*, and where they differ, **this spec wins**.

---

## 0. Read first — the rules that govern every other decision

1. **The completion test outranks every feature.** Nothing is validated until real waitlist students finish the core loop (reflect → log skills → save) **twice**. Build the loop until it retains *before* adding surface area. Don't build features, an export dashboard, or a content library ahead of a loop that's shown to retain.

2. **Framework naming is a hard rule — do not violate it in UI copy.**
   - **User-facing copy says "NMBA standards"** (the NMBA Registered Nurse Standards for Practice). The string "ANSAT" must **never** appear in any screen, label, button, placeholder, or notification a student sees.
   - **The data model uses the ANSAT 7-domain / 23-item structure under the hood** for mapping granularity and auditability. Table names, internal fields, and the mapping logic may use ANSAT terminology; the rendered UI never does.
   - _Why: ANSAT is the NMBA standards operationalised into assessable items — richer for data and auditable ("why Standard 4?"), but it's a specific instrument with licensing questions unresolved. Mapping to it internally is fine; naming it to students is exposure with no user benefit._

3. **Two distinct flows — do not merge them.** *Onboarding* (first-ever session: get the student set up and to one saved artifact) is separate from the *core loop* (the recurring reflect→log→save they do after every shift). They share components but are different journeys. Merging first-run setup into the everyday loop breaks both. Sections 2 and 3 below.

4. **Honesty is a design constraint, not a tone.** The app never claims data is "safe" or "de-identified," never claims logs are assessment evidence. These aren't copy preferences — they're the difference between a CNF/academic trusting the product and puncturing it on first contact. Detailed in §4 and §5.

---

## 1. Product in one paragraph

Prac. is a free-forever placement companion for Australian nursing students. After a shift, a student writes a short structured reflection, logs the skills it surfaced, and the app maps that to the relevant NMBA standards and saves it to a growing personal record they own and can export. The free tool's job is **acquisition + corpus capture**, not conversion. Revenue comes years later from a paid new-grad employability layer (selection-criteria + cover-letter toolkit, ~$39–49 seasonal unlock) pre-filled from the student's own logged data. The fragile joint in the whole model is the **multi-year handoff**: a 1st-year must still be using and remembering Prac. as a 4th-year for the paid layer to convert. Every decision below serves either corpus quality or that handoff.

**Brand:** Fraunces (display) + DM Sans (body/UI). Teal #4ecdc4 as the confident action/accent colour only; calm sage/eucalyptus greens + warm off-white as the ground. The full stop in "Prac." is a design device. Mood: supported and capable, **not** clinical. One decision per screen; generous whitespace.

---

## 2. Onboarding flow (first-ever session)

**Goal:** get a reachable identity + the student to **one saved artifact**, with the least possible friction. Activation = "created one meaningful thing," not strictly "logged a shift" — much of the funnel signs up pre-placement.

**Input rule:** exactly **one text field in the whole flow (email)**. Everything else is tap-select. Optimise for completion.

### Screen sequence
1. **Welcome.** RN credibility badge ("Built by a registered nurse") + "free for your whole degree." One CTA. No gate — value is visible before signup.
2. **Email** (the load-bearing screen). Framed as cross-year continuity: log in once, Prac. remembers across the whole degree. Magic-link / passwordless — students lose passwords across years. _This sits **before** the branch deliberately, to protect the multi-year handoff; flagged for A/B test against email-after-activation (§7)._
3. **Context branch — "Where are you right now?"** Three tap options that route activation:
   - *On placement now* → first reflection (§2 path A)
   - *Placement this semester* → saved ward-prep guide (§2 path B)
   - *Just looking around* → light browse of standards + guide
4. **Year** — tap-select chips: 1st / 2nd / 3rd / 4th year / Postgrad. (Copy: maps reflections to the right **NMBA standards**.)
5. **Specialty / ward** — tap-select chips: Med-surg, Aged care, Mental health, Emergency, Paediatrics, Community, Not sure yet, **None of these**. ("Not sure yet" = doesn't know the ward; "None of these" = knows it, not listed — keep both distinct.)

### Activation paths
- **Path A (on placement):** drop straight into a **genuinely blank** first reflection — no pre-filled standard/domain, no worked example masquerading as content. A neutral prompt label lowers the blank-page barrier ("One thing you did today that you're proud of"). It's their real first entry. Save → success.
- **Path B (upcoming / exploring):** a saved ward-prep guide delivers immediate value with no shift to log, and sets a **placement-start return trigger** (see open question §7 — the trigger needs a captured placement date or the "we'll remind you" promise is empty).

### Success screen
Confirms the artifact saved; **the future-value seed appears once, gently, here only** ("everything you log now quietly builds the record your final-year self uses for grad") — not its own screen, not woven through earlier steps.

---

## 3. Core loop (the recurring engine — the real product)

This is what students do after every shift once onboarded. It is the corpus-building behaviour and the thing the completion test measures.

### Ordering (changed from original brief): `Reflection → Skills → NMBA mapping → Saved`
The brief had mapping mid-flow; it's moved to the **end**. Reflection surfaces what mattered → skills fall out of it (concrete, easy) → mapping is inferred from both at the review/save step.

### Reflection screen
- **One screen, three soft prompts** (_what happened → so what → now what_), **not** three gated screens. "Now what?" is optional. Placeholders reframe each prompt so a tired brain isn't facing a blank box.
- _Why: every screen transition is an abandonment point; gating multiplies drop-off at 9pm with an infant and bad hospital signal._

### Skills
- **New/Renewed status: auto-detected from the student's own history**, one-tap override. Never a manual toggle — the app already knows the history; don't make a tired person recall it.
- **Free-text skills allowed as fallback**, but matched aggressively against the skill library first and **queued for normalisation** — raw strings never written silently into the corpus. _The structured corpus is the core asset; "wound care / Wound Care / dressing change" as separate entries degrades it over 2–3 years._
- **Standalone "just log a skill" path** exists separately from the full reflection flow. Logging skills is high-frequency/low-effort; full reflection is low-frequency/high-effort. Don't trap the frequent corpus-building behaviour behind the rare heavy one.

### NMBA mapping (rendered as "NMBA standards"; ANSAT 7/23 structure underneath)
- **Inferred, pre-selected, editable** — folded into the review/save screen, **not** a standalone manual gate. Candidate standards derived from logged skills (skill library is pre-tagged to ANSAT items) + a keyword→standard table over the reflection text. Student confirms or adjusts; **never selects from 23 items cold.**
- **No nightly 1–5 self-scoring.** Mapping only. Scoring is the assessor's role in real ANSAT — replicating it produces noise and oversteps the student's role.
- _Why inference not manual: manual taxonomy mapping at 9pm produces noisy data, interrupts momentum, and the mapping is itself the competency students are still learning._

### State & save
- **Autosave / drafts on every screen — non-negotiable.** 9pm + one-handed + infant = interruption is the default; a lost half-written reflection is a churned user.
- **Empty state names the asset being built.** **Saved state shows the corpus growing** (reflections / skills / standards).
- **Coverage ("6 of 7 standards") is a quiet stat, never the organising frame.** _A coverage grid as the main UI invites Goodhart — students logging to fill the grid rather than because the reflection surfaced it, corrupting both the corpus and the reflective practice._

---

## 4. History & export (the payoff surface)

**Framing:** a **student-owned reflective record**, exportable/shareable at the student's choice. **Explicitly NOT** assessment evidence, competency proof, or proof of practice. _Self-reported logs aren't assessment evidence; claiming so detonates the "credible clinician" positioning the instant a CNF or academic sees it. In most AU programs the assessor completes ANSAT, not the student._

**v1 scope:** a **filterable history + clean export.** **Not a portfolio dashboard** — a portfolio is empty for the first weeks, so its payoff is back-loaded past the week 1–3 churn window. Early retention comes from the per-session loop.

**Filters:** by NMBA standard (primary), skill type (New/Renewed), recency.

### Identifier handling (this is a design control, not a checkbox)
- **Identifier-review gate:** a **mandatory step between "choose export scope" and "file exists"** — structural, not a setting. Every flagged identifier forces a human decision (fix, or explicitly dismiss) before a file can generate.
- **Writing-time inline nudge** flags likely identifiers as the student types; the flag **persists** into history/detail views so confidentiality is a running habit, not a final hurdle.
- **Copy discipline — absolute:** the UI **never** says "safe" or "de-identified." Coaching register only — _"we flag what we can spot; the rest is on you."_ State fallibility on-screen, **including on the success screen** where confidence is highest. _A heuristic that says "no issues found" manufactures false confidence and ships the breach. The honest claim is the one a CNF can't puncture._
- **Sign-off ≠ control.** A click-through agreement is a liability shield for you, not a safety control for the data. Keep it if legal wants it — it's the floor, not the mechanism.

### Honest limits (keep on the record, design around them)
- A client-side heuristic misses **unstructured** identifiers ("the only patient of X background that week," rare presentations, indirect references).
- The **share step is outside the app's control** — once the file leaves, reach is zero. The gate is the last point of influence.
- Because the corpus syncs (see §5), gate copy is **"before you share this,"** not "before this leaves your phone." Still honest, now true.

---

## 5. Backend / architecture (Claude Code · Vercel + Supabase)

**Two separate decisions — do not conflate: where the _check_ runs vs. where the _corpus_ lives.**

### Corpus storage: store + harden (decided)
Supabase holds the corpus — a 2–3 year asset can't live on one phone. Requires:
- **Row-level security** (a student only ever sees their own rows)
- Encryption at rest
- A real privacy policy
- _Consequence already absorbed into §4 copy: clinical text does sync, so the gate says "before you share."_

### Identifier check: in the app bundle — NOT a backend service, NOT an LLM
Deterministic JS/TS:
- Regex for **structured** identifiers: ages ("84yo"), "bed 3", room/MRN-style digit runs, dates, phone numbers.
- Name detector: curated common AU given/surname list + title patterns (Mr/Mrs/Dr + Capitalised) + lone clinical initials.
- On-device NER (ONNX / transformers.js) is a **v2** recall upgrade, not v1.
- _Why: routing raw clinical text through a server/edge function to check it defeats the entire point._

### NMBA mapping suggestion: client-side, deterministic — NOT an LLM
- It's a **join, not inference**: union of standards from logged skills (skill library pre-tagged to ANSAT items) + a small keyword→standard table for the text signal (e.g. "communicat\*"→Std 2, "medication"→Std 4/6, "documented"→Std 6).
- _Why: an LLM here sends text off-device, costs per call, and is nondeterministic — to replace a join you can already do. Deterministic is also auditable when a CNF asks "why Standard 4?"_
- **The real work is authoring the `skill → ANSAT item` mapping table** — clinician content only the founder can write. This is the moat and the bottleneck.

### Data model (indicative)
- Core: `profiles`, `reflections` (with **draft state** for autosave), `skills_logged`
- Reference: `skill_library`, `ansat_standards` (7 standards / 23 items — internal naming OK), `skill_ansat_map`, `identifier_flags` (so the "to review" pill persists)
- Reference tables are served to the client; **the client computes the suggestion and runs the check.**

### Vercel
Hosts the frontend. With Supabase called directly under RLS and processing on-device, v1 needs **few or zero serverless functions** — don't build an API layer you won't use.

### Offline
Matters here (hospital signal is bad; 9pm is real). Client-side checks already work offline. **Decide: does _save_ require connectivity, or queue locally?** (Open — §7.)

### Expo vs PWA — still open
Architecture holds either way; only the language the check is written in changes. **Note:** native push weighs toward Expo because the multi-year re-engagement (the fragile joint) depends on reliably reaching students between placements — a stronger reason here than for most apps.

---

## 6. Ward guides — a funnel, not a library

**Decision: acquisition funnel, NOT an in-app content library.** Free public guide (SEO/share catch) → soft conversion → in-app priming.
- _Why generic in-app ward guides are a trap: editorial content rots (protocols vary by state/hospital/year), has no moat against free incumbents (uni packs, Ausmed, YouTube, the CF), and carries scope-of-practice liability with the founder's name on accuracy. Capture features compound; content features are a maintenance liability._

**Content = texture, not facts.** What the ward feels like, what surprises students, likely skills, reflection prompts. **No protocols, no clinical instruction.** Visible boundary line: _"general guidance from experience, not clinical instruction — follow your facility's protocols and your facilitator."_ _Experience and prompts can't go out of date or be wrong per facility; facts can._

**Ungated.** The guide is genuinely free; the app is the upgrade. Conversion sits **after** the value, framed as reciprocity ("you just read the whole guide — free"). _Walling free educational content to harvest emails burns the trust the brand sells._

**Byline = the differentiator, must be verifiably real** (name, face, actual background). "A real nurse who worked this ward" is what Google can't rank around.

**In-app priming:** when a placement block is set, the guide reappears **actionable** — likely skills as one-tap quick-adds (standard-tagged), prompts pre-loaded. **Priming, not prescribing**: optional, skippable, "nothing to fill in now." _Lowers cold-start friction without telling the student what their placement "will" contain (scope liability)._

**Build ONE guide first**, for the actual highest-volume first placement (**med-surg or aged care — not cardiac**; cardiac was illustrative). One guide is a probe to test whether the funnel converts; ten is an accidental content business.

**Durable endgame:** corpus-generated guides ("students on this ward most often log these skills/themes") — uniquely yours, zero maintenance, uncopyable. Impossible until you have students and data. Authored guides are the bridge, not the destination.

---

## 7. Open questions (do not silently resolve these — flag to founder)

- **Onboarding:** reflection prompts fully visible vs. progressively revealed as each fills.
- **Email placement:** before vs. after first activation (A/B test).
- **Placement-start date capture:** the prep-guide return trigger is an empty promise without it. Either add a tap-select date on the specialty screen, or change the copy. **Don't ship the promise without the mechanism.**
- **First-log domain mapping:** auto-assign for the *first* log (near-zero friction) vs. tap-select from the start. Current lean: auto for first, surface choice thereafter.
- **NMBA 1–5 self-scoring:** currently **no**. Revisit only with a reason.
- **Offline save:** require connectivity vs. queue locally.
- **Expo vs PWA.**
- **The reflection trigger** — what actually gets a tired student to open the flow at all (notification / home nudge / facilitator prompt). **This matters more than any screen and is currently undesigned.** Highest-value open problem.
- **Data-reusability assumption:** the whole free-tier→paid-layer model assumes 1st-year reflective prose is reusable as 4th-year selection-criteria evidence. Pressure-test how much survives without heavy reprocessing before over-investing in "log everything now."

---

## 8. Waitlist & acquisition (context for build priorities, not part of the app build)

Included so build sequencing stays honest: **don't pour funnel in before the loop retains.**

**Goal is segmentable, test-willing signups — not raw email count.** 80 students you can email "your placement's in 3 weeks — want to try it?" beats 2,000 you can't address.

**Fix the form first** (currently email-only — a permanently degraded asset). Add exactly four fields: university, year of study, month of next placement, "happy to test early?" toggle. _Resist more — every extra field cuts completion. Only collect tester interest if the loop is weeks from testable; otherwise drop the toggle._

**Highest-leverage play:** societies as distribution partners (already in QUT SUN / USC) — bring the co-branded ward guide as free value for their members. Land one, use as proof for the next. Time outreach to the 3–4 week pre-placement anxiety window. **Don't** run paid ads pre-launch, buy lists, or spread across all channels — solo + infant means depth over spread.

---

## Quick do-not index
- Don't let "ANSAT" appear in any user-facing copy (internal data model only).
- Don't merge onboarding with the recurring core loop.
- Don't make NMBA mapping a manual mid-flow gate; infer at save, pre-selected and editable.
- Don't make New/Renewed a manual toggle (auto-detect from history).
- Don't let free-text skills into the corpus unnormalised.
- Don't pre-fill a domain or worked example on the genuine first reflection.
- Don't claim the export is "safe" / "de-identified"; don't rely on a sign-off as the confidentiality control.
- Don't run the identifier check or NMBA mapping through a server or LLM (v1).
- Don't build an in-app ward-guide library; don't gate guide content behind email.
- Don't build a portfolio dashboard for v1 (back-loaded payoff past the churn window).
- Don't build an API layer Supabase-under-RLS makes unnecessary.
- Don't ship features or pour in funnel before the core loop is shown to retain (twice).

---
---

# Appendix A — Build & deploy discipline (engineering contract)

_Carried over from the prior engineering CLAUDE.md when the product spec above became the body of this file (decision: 19 Jun 2026). The spec says **what** to build; this appendix says **how** to build and ship it without breaking. Both are binding; satisfy the Definition of Done (§A6) before any commit/push._

### A1. Verify before you push
- Run **`npm run verify`** (lint + typecheck + production build) and see it **GREEN** before every commit/push — no exceptions, even one-liners. CI (`.github/workflows/ci.yml`) runs the same checks; a red CI is never merged.
- **A green build ≠ a working deploy.** Know which runtime each file targets (Edge vs Node serverless vs browser) and confirm its imports are legal there. If `verify` can't run (e.g. no network), say so in the reply rather than claiming a pass.

### A2. Middleware / runtime (hard-won — do not relearn)
- **Do not add a Next.js `middleware.ts` on this project.** Every variant 500'd on Vercel (`MIDDLEWARE_INVOCATION_FAILED` / `__dirname is not defined` on Edge; CJS-vs-ESM on the Node runtime). Auth redirects live in the **client guard `src/auth/guard.tsx`** wired into the route-group layouts. Gate in a client/server component, never middleware.
- Keep Node-only deps (e.g. the full `@supabase/supabase-js`) out of any Edge-runtime bundle.

### A3. Security & data (the spec's §4/§5 are binding; this restates the invariants)
- **RLS on every table from its first migration**, deny-by-default, then the narrowest policy. Rows owner-scoped via `auth.uid()`. Identity/role derived server-side, never trusted from the client.
- Only the Supabase **anon key** ships to the browser (safe only because RLS holds); the **service-role key never** touches client code.
- **No reflection content or PII** in logs, analytics, or error payloads. The identifier check and NMBA mapping run **on-device, deterministic** — never via a server or LLM (§5).
- Patch security advisories immediately (`npm audit`, Supabase advisors) on their own commit; keep `package-lock.json` committed and installs reproducible.

### A4. Infra facts (operator is **not** versed in Vercel/Supabase — inspect & act via MCP/git, explain in plain language; get a yes before production pushes)
- **Supabase:** project ref `kkytglabcwevvnjmmrhy` (`prac-app-database`, region `ap-southeast-2` Sydney, **free plan**). RLS-enabled tables incl. the core set + the hospital directory (`hospitals`, `hospital_tips`, `hospital_reference_cards`, `hospital_tip_votes`, `hospital_requests`); `profiles.is_moderator` flags global moderators. 11 universities + 7 RN ANSAT standards seeded; hospital directory seeded (6 VIC hospitals, 12 published tips). Founder/admin account (a moderator) has a seeded profile + placement + reflections — credentials held privately by the founder; never commit them, rotate via Supabase if exposed. Security advisors (post-hardening 0008–0011): `search_path` now pinned on **all** SECURITY DEFINER fns; `hospital_tip_votes` and `anon_action_log` RLS-enabled-no-policy are **intentional** (deny-all, definer-RPC-only); `submit_hospital_tip`/`request_hospital`/`cast_hospital_vote` anon-executable is **intentional** (the anonymous-write feature, now per-device rate-limited). Remaining: leaked-password protection (Auth setting, **needs Pro plan**).
- **Vercel:** project `prac-app` (team `klachlan212-6694s-projects`), framework Next.js. **Canonical production URL: `https://prac-app-klachlan212-6694s-projects.vercel.app`** — always test this, not a per-deployment `prac-<hash>` URL (those are frozen/old). **Deployment Protection (Vercel Authentication) is ON** → 401 for anyone not logged into the Vercel account; disable it (or use a share link) for open/incognito demo.

### A5. Git & workflow
- Develop on **`claude/confident-turing-wspzot`**; **never push `main`/production without explicit permission**; no PRs unless asked. Descriptive commits; one logical change each.

### A6. Definition of Done
- [ ] `npm run verify` green (lint, typecheck, build); Edge-deployed code free of Node-only APIs (A2).
- [ ] Access control reviewed (A3): users reach only their own rows; new tables deny-by-default with the narrowest RLS; no content to any aggregate/admin path; identity server-derived.
- [ ] No secrets, reflection content, or PII in code, logs, commits, or error paths.
- [ ] No new/known-vulnerable dependency; advisories patched; none that sends content off-device.
- [ ] UI meets a11y bar: ≥44px touch targets, dark-mode parity, visible focus, the app never loses text (autosave).
- [ ] "ANSAT" appears in **no** user-facing copy (§0.2); honesty copy respected (§4) — never "safe"/"de-identified".
- [ ] Committed with a clear message and pushed to the feature branch; anything skipped/unverified is stated plainly.

### A7. UI & copy conventions (codified design rules)
_Adopted from the 22 Jun UI-polish review. Apply to every new or touched surface; sweep opportunistically._

- **No em dashes in user-facing copy.** Use commas, full stops, colons, parentheses, or "to" for ranges. (They render inconsistently and aren't the brand voice.) Code comments are exempt.
- **Icons, not glyphs.** Never ship raw UTF symbols as UI (`+`, `✓`, `→`, `›`, `★`) — they vary in weight/baseline across platforms. Use **Lucide** (`lucide-react`, monochrome, `currentColor`) as the primary icon set for affordances (nav, buttons, list markers, checks, chevrons, plus). Reserve **colourful emoji** for occasional warmth/illustration, and when used, use **Microsoft Fluent UI Emoji** assets (consistent across Apple/Android), never the platform's native emoji font. Default to Lucide; emoji is the exception.
- **Buttons must read as buttons.** Any action that isn't inline body text gets a button/affordance treatment (fill, border, or pill), not bare coloured text. A trailing arrow alone is not enough.
- **`user-select: none` on non-text UI.** Buttons, labels, and `[role=button]` are handled globally in `globals.css`; add `select-none` to decorative spans (step numbers, status badges, pills, nav glyphs).
- **Minimum font size.** Subtitle/body copy ≥ 12px (`text-xs`); `text-[10px]/[11px]` is for rare mono micro-labels only. Keep tiny subtitles few — prefer one clear subtitle over stacked micro-text (cognitive load).
- **Consistent hierarchy.** Empty states, list rows, and cards share one scale (icon sizes, line-heights, heading/subtitle steps). When adding an empty state, mirror an existing one.
- **Page transitions.** Smooth fade/rise on every route change via `app/template.tsx`; `@view-transition { navigation: auto }` adds native cross-document transitions where supported. Honour `prefers-reduced-motion`.
- **Public marketing site (`/`, guides, hospitals, legal):** keep a marketing footer and a header "Sign in" (top-right) for returning users; the primary CTA drives install. **Do not** show the authenticated app's bottom tab bar to logged-out visitors — let them explore the genuinely-public pages (guides, hospitals) instead.
- **Carry state forward.** Never ask for the same input twice — e.g. an email entered on the landing flows into sign-in and auto-triggers the code send.
- **Landing mocks track the real UI.** When app copy/labels/mapping change, update the landing screenshot mock to match.

### A8. Decisions log (condensed)
- Migrations + seeds applied to Supabase (Sydney); RLS verified.
- **Production deploy saga, resolved:** `main` was a static Hello-World placeholder → app promoted to `main`; middleware removed entirely (it 500'd in every form) in favour of the client guard; the "all routes 404" was a wrong-URL + Vercel build-settings issue, plus Deployment Protection. App now serves on the canonical domain. **Do not reintroduce middleware.**
- Added email+password sign-in to dodge Supabase free-tier OTP email limits. **Tension:** the spec (§2) wants **passwordless/magic-link** for the multi-year handoff — treat password as a dev-only convenience and revisit before v1.
- **19 Jun 2026:** product spec (§§0–8) adopted as the body of CLAUDE.md; this appendix preserves the engineering guardrails (per "merge into one CLAUDE.md" decision). Next: re-plan the v1 build around the core loop (rule §0.1).
- **19 Jun 2026 — v1 redesign built** on `claude/confident-turing-wspzot` (from the founder's `designs/*.html`): brand foundation (Fraunces/DM Sans, teal/sage/paper, **light-only**); core-loop data model on Supabase (migration `0003`: structured prompts + draft state, ANSAT 23 items, `skill_library`/`skill_ansat_map`, `skills_logged` + `identifier_flags`, RLS clean); and every student surface rebuilt — sign-in, onboarding (tap-select), reflections home, the reflect→skills→NMBA→saved loop (autosave, on-device identifier nudge, auto New/Renewed, inferred mapping), export + **mandatory identifier gate**, settings — plus one public ward guide (med-surg) + in-app priming. UI renders **"NMBA standards"** (never ANSAT); honesty copy holds. **Deferred / founder TODO:** admin module; real `skill→ANSAT` map + real guide byline (the moat, §5/§6); email-first/magic-link onboarding (§2/§7); revisit password→passwordless. **Production (`main`) untouched** — redesign awaits a ship decision.
- **20 Jun 2026 — `DESIGN.md` added** (portable as-built design reference for designing new features; complements this spec + `designs/*.html`).
- **20 Jun 2026 — Hospital Directory built** on `claude/confident-turing-wspzot` (founder request; a deliberate exception to §0.1/§6 — new community-content surface). Public `/hospitals` (roster in-code) + `/hospitals/[slug]` profile: 5 categories, populate/hybrid/sparse states, anonymous toggle-voting, freshness fade + refresh banner, deterministic ranking, submission form. **Backend applied to live Supabase (migration `0004`):** `hospitals`/`hospital_tips`/`hospital_reference_cards`/`hospital_tip_votes`, `profiles.is_moderator`; anonymous **submit → moderation queue** + **vote** via hardened SECURITY DEFINER RPCs (`submit_hospital_tip`, `cast_hospital_vote`); published-only public reads, moderator-only review via inline-subquery RLS. Moderation queue added to `/admin`; "Hospitals" added to in-app nav. **Best-effort only:** anonymous-write rate-limiting/captcha is a follow-up; seed tips are hedged placeholders (real verified content is founder work). **Production (`main`) still untouched.**
- **20 Jun 2026 — Hospital moderator management** (migration `0005`): moderators can add/edit hospitals and add/edit/delete reference cards from `/admin` (`HospitalAdmin`), gated by moderator-only insert/update/delete RLS (inline `is_moderator` subquery). Roster is now **DB-driven** — directory list + profile fetch hospitals from Supabase (`fetchHospitals`/`fetchHospitalBySlug`), so additions appear without a redeploy; the in-code `HOSPITALS` array is kept only for `generateStaticParams` + metadata of the seeded six. RLS verified by role simulation (moderator writes pass, non-moderator denied). **Production (`main`) still untouched.**
- **21 Jun 2026 — Session: bug sweep, nav, features, security hardening, org removal** (`claude/confident-turing-wspzot`). Built: bottom **tab-bar nav** (Home/Reflect/Resources/Profile) + Resources/Profile hubs + a Today/streak Home; filterable **`/history`**; item-level (23-item) mapping now persisted through sync; **Back** nav in the reflect flow; `hospitals.state` + state filter (**0006**); **`hospital_requests`** capture queue + `request_hospital` RPC (**0007**). Fixed (QA sweep): silent "Saved" with no active placement; export dropping so-what/now-what; identifier-dismissal wipe on autosave; auth-hang on network error; returning-user re-onboard (profile pull/fallback). **Security audit → hardening (0008–0010):** revoked write grants on read-only reference tables; pinned `search_path` on all SECURITY DEFINER fns; URL allowlist on ref-card `source_url`; reflection length CHECKs; **per-device rate limiting** on the anon hospital RPCs (`anon_action_log`, 10 submits/60 votes per hour). **Removed the unused organisation/cohort-admin system (0011):** dropped `organizations`/`memberships`/`invitations` + `create_organization`/`accept_invitation`/`get_org_adherence`; `/admin` is now **moderator-only**; onboarding invite hook removed. Deleted dead code (`src/auth/server.ts`, unused data helpers). **Production (`main`) still untouched.**
- **21 Jun 2026 — Shipped to production.** Merged `claude/confident-turing-wspzot` → `main` (merge `2fb205e`); `npm run verify` green on the merged tree before the push. Production now serves the full app (v1 core-loop redesign, bottom-tab nav, history, placement editing, hospital directory + requests + rate-limited anonymous writes + moderator tools, security hardening through migration **0012**). The live Supabase already held all migrations, so prod code + DB match. **Caveat:** Vercel **Deployment Protection (Vercel Authentication) is still ON** — the canonical URL returns 401 to the public until it's disabled in project settings (that's the remaining gate for open/student access, not a deploy step). Auth remains password + OTP (magic-link still the spec goal); leaked-password protection still needs Pro. Active development continues on `claude/confident-turing-wspzot`; merge to `main` to re-deploy.
- **22 Jun 2026 — Reflection-system overhaul + landing/legal + hospital surfacing, shipped to production.** Built on `claude/confident-turing-wspzot`, then merged → `main` (merge `3a30112`); `npm run verify` green on the merged tree before the push. **Reflect flow:** added an 8-cue **topic picker** before "What happened?" (swaps the prompt, pre-maps standards, scopes suggested skills); **"Now what?" is now required**; skills search/suggestions **filtered by placement context**; **custom-task path** ("can't find it? add your own" → 60-char text → 7 plain-language standard chips → saved `custom`, flows to log/export). **Real skills taxonomy seeded** (migration **0013**, ~75 tasks each → its NMBA standard + the placement contexts it applies to) — replaces the placeholder starter set; this is founder content (the moat) now live. **Placement context is structured:** `placements.context` (one of 8 tags), onboarding chips + placement editor set it, Home/onboarding guide priming keys off it (`CONTEXT_TO_GUIDE`). New columns `skill_library.contexts[]`, `skills_logged.custom`/`nmba_standard`; sync carries them. **Admin:** moderator-only **Custom tasks** report via `get_custom_tasks()` (aggregate name·standard·uses; internal `is_moderator` gate, `search_path` pinned; **0014** revokes the default PUBLIC/anon execute so only authenticated moderators reach it — verified by role simulation + advisors). **Hospital Directory surfaced** (it sat a level down under Resources): temporary, reversible **spotlight card on Home** + a **self-clearing "New" dot** on the Resources tab (clears once `/hospitals` is visited). Also shipped: **landing page at `/`**, **legal/support pages** (`/privacy`,`/terms`,`/support`) + footer + signup consent, real app icon, governing state NSW. Advisors clean (only the known/intentional set remains). **Same caveats unchanged:** Vercel Deployment Protection still ON (401 to public until disabled); password+OTP auth (magic-link still the goal); leaked-password protection needs Pro. Dev continues on `claude/confident-turing-wspzot`.
