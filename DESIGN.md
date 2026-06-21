# Prac. — Design Reference (as-built v1)

_A portable snapshot of the built app for designing new features. Pair this with a
fresh Claude session: paste or upload it, then describe the feature you want._

> **Two companion files, different jobs.**
> - **`CLAUDE.md`** = the build brief — the **why** (rationale, counter-intuitive
>   decisions, the "do-not" index). It wins on any conflict.
> - **`DESIGN.md`** (this file) = the **what** — the concrete system as built: tokens,
>   screens, copy, data model, on-device logic.
> - **`designs/*.html`** = interactive visual mockups (onboarding, reflection-flow,
>   history-export, ward-guide-funnel).

## 0. Two hard constraints that govern every new screen

1. **Say "NMBA standards", never "ANSAT" in any user-facing copy** — labels, buttons,
   placeholders, notifications. The 7-domain / 23-item **ANSAT** structure is the
   *internal data model only* (table names, internal fields). Every copy example in
   this doc already obeys this; keep it that way.
2. **Honesty register on confidentiality.** The UI never says data is "safe" or
   "de-identified," never calls a log "assessment evidence." The identifier check
   states its own fallibility on-screen — _"we flag what we can spot; the rest is on
   you."_ This holds even on success screens.

---

## 1. Product in brief

Prac. is a **free-forever placement companion for Australian nursing students**. After
a shift, a student writes a short structured reflection, logs the skills it surfaced,
and the app maps that to the relevant **NMBA standards**, saving it to a growing
personal record they own and can export. The free tool's job is acquisition + corpus
capture; revenue comes years later from a paid new-grad employability layer pre-filled
from the student's own logged data. The fragile joint is the **multi-year handoff**: a
1st-year must still be using Prac. as a 4th-year. Every design decision serves either
corpus quality or that handoff.

**Mood:** supported and capable, **not** clinical. One decision per screen; generous
whitespace. The full stop in "Prac." is a brand device (and reappears as a quiet
"commit" cue on success headings: "Saved.").

---

## 2. Brand & design system

Source of truth: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`.
**Light-only for v1** — `darkMode: 'class'` is configured but the `dark` class is never
applied (`src/lib/localSettings.ts` `applyTheme`), so any stray `dark:` utilities stay
inert. Don't design dark-mode-dependent features.

### 2.1 Colour tokens (exact)

| Token | Hex | Role |
|---|---|---|
| `paper` | `#f6f4ef` | Warm off-white page ground; also theme-color |
| `surface` | `#ffffff` | Cards / content surfaces |
| `ink` | `#0e2725` | Primary text (deep teal-black) |
| `ink.soft` | `#4a5d5b` | Secondary text, labels |
| `ink.faint` | `#8aa09d` | Hints, placeholders, timestamps |
| `line` | `#e7e3da` | Borders / dividers |
| `line.soft` | `#eef0ec` | Faint dividers |
| `teal` | `#4ecdc4` | **The** action/accent colour (buttons, focus ring) |
| `teal.deep` | `#16857c` | Stronger teal — selected/hover text, link text |
| `teal.bright` | `#2fb3aa` | Primary button hover |
| `teal.ink` | `#06302c` | Text on teal fills |
| `sage.50/100/200/300` | `#eef2e9` / `#e3ebdd` / `#cdddc6` / `#aecaa6` | Calm ground; secondary buttons, hover borders |
| `eucalyptus` | `#7fa08a` | Muted green accent |
| `new` / `new.ink` | `#e3f7f4` / `#16857c` | "New" skill badge + selection highlight |
| `renew` / `renew.bg` | `#6b7f8c` / `#eef2f4` | "Renewed" skill badge |
| `flag` / `flag.bg` / `flag.line` / `flag.ink` | `#c97a2b` / `#fbeede` / `#ecd2b0` / `#7a4a18` | Identifier-review / confidentiality (warm amber) |
| `plum` / `plum.bg` / `plum.ink` | `#7a5c8e` / `#f1ebf4` / `#4f3a60` | Reflection-prompt accent |

**Body ground** (`globals.css`) — soft sage/eucalyptus radial gradients over paper,
`background-attachment: fixed`:

```css
background:
  radial-gradient(1200px 600px at 12% -8%, #eef9f7 0%, transparent 60%),
  radial-gradient(900px 500px at 100% 0%, #f0efe7 0%, transparent 55%),
  #f6f4ef;
```

### 2.2 Typography

Loaded via a Google Fonts `<link>` in `app/layout.tsx` (deliberately not `next/font`
— a build-time fetch can be blocked by the sandbox and break `verify`).

| Family | Token | Use | Weights |
|---|---|---|---|
| **Fraunces** | `font-display` | Display / headings | 400–700 (opsz 9–144) |
| **DM Sans** | `font-sans` | Body & UI (default) | 400–700 (opsz 9–40) |
| **DM Mono** | `font-mono` | Labels, dates, standard IDs, sync status | 400, 500 |

Observed scale: page headings `text-2xl` (Fraunces 600–700); brand/logo `text-xl`;
card headings `text-lg`; body/labels `text-sm`; hints/meta `text-xs`; standard IDs &
micro-labels `text-[10px]`/`text-[9px]`; button text `text-[15px]`.

### 2.3 Shape, depth, spacing, motion

- **Radii:** `field` 14px (inputs), `card` 18px (cards/textareas), `xl2` 20px; buttons
  use `rounded-2xl` (16px), nav/list items `rounded-xl` (12px), badges `rounded-lg`.
- **Shadows:** `card` (subtle elevation), `soft` (floating panels), `float` (toasts /
  overlays). Shadow tint is warm dark-teal (`rgba(44,58,48,…)`).
- **Spacing:** Tailwind default scale; common gaps `1.5 / 2 / 3 / 5 / 8`, card padding
  `p-4`, textarea `p-3.5`.
- **Motion:** quiet `transition` on interactive states; no large animations.

### 2.4 Accessibility bar (binding)

- Touch targets **≥44px** (chips 44, buttons/inputs 48).
- Visible focus: 2px teal ring with paper offset (`focus-visible:ring-2
  ring-teal ring-offset-2 ring-offset-paper`).
- The app **never loses text** — autosave everywhere (§6.2).
- High-contrast ink-on-paper; semantic elements; `aria-pressed` on toggles.

---

## 3. Component library

Single source: `src/ui/components.tsx`. **Prop APIs are stable** — reuse these rather
than hand-rolling new primitives.

| Component | Signature / variants | Notes |
|---|---|---|
| `Button` | `variant?: 'primary' \| 'secondary' \| 'quiet' \| 'ghost' \| 'flag' \| 'danger'` | Full-width, `min-h-48`, teal focus ring. primary = teal fill + glow; secondary = sage-100; quiet = bordered surface; ghost = text-only teal-deep; flag = amber fill; danger = bordered amber. |
| `Card` | `div` props | `rounded-card border-line bg-surface p-4 shadow-card`. |
| `Input` | native input props | `min-h-48 rounded-field`, teal focus ring, faint placeholder. |
| `Label` | native label props | `text-sm font-semibold text-ink-soft`. |
| `Field` | `{ label, htmlFor?, hint?, children }` | Label + control + optional faint hint; `space-y-1.5`. |
| `Chip` | `{ active?: boolean }` + button props | Tap-select pill, `min-h-44`, `aria-pressed`. active = teal border + `new` bg + teal-deep text. |

**Recurring patterns** (not exported components, but consistent — see
`ReflectionEditor.tsx`, `reflections/page.tsx`):

- **Status badges:** New → `bg-new` + teal-deep text; Renewed → `bg-renew-bg` +
  `text-renew`.
- **Standard tag:** `bg-new` pill, `font-mono text-[10px] text-teal-deep` (e.g. "4").
- **Identifier/flag alert:** `border-flag-line bg-flag-bg text-flag-ink` with a `⚑`
  glyph in `text-flag`.
- **Undo toast:** fixed bottom, `bg-ink text-paper rounded-2xl shadow-float`.
- **Sync chip:** mono "Autosaving…" / "Saved" with a teal dot.

---

## 4. Route map

App Router. `(student)` and `(admin)` route groups are wrapped by `AuthGuard`
(`src/auth/guard.tsx`) via their layouts; auth redirects live in this **client guard,
never middleware** (every `middleware.ts` variant 500'd on Vercel — do not reintroduce).
Shared chrome: `src/ui/AppShell.tsx` (header, nav, sync dot, sign-out).

| Route | File | Screen |
|---|---|---|
| `/` | `app/page.tsx` | Redirect → `/sign-in` |
| `/sign-in` | `app/(student)/sign-in/page.tsx` | Auth (password + passwordless OTP) |
| `/onboarding` | `app/(student)/onboarding/page.tsx` | First-run setup (tap-select) |
| `/reflections` | `app/(student)/reflections/page.tsx` | Reflections hub / list |
| `/reflections/new` | `app/(student)/reflections/new/page.tsx` | Core loop (`?mode=skill` = skill-only) |
| `/reflections/[id]/edit` | `app/(student)/reflections/[id]/edit/page.tsx` | Same editor, loads existing |
| `/export` | `app/(student)/export/page.tsx` | Export + identifier gate |
| `/settings` | `app/(student)/settings/page.tsx` | Reminders, assistance, account |
| `/guides/[slug]` | `app/guides/[slug]/page.tsx` | **Public** ward guide (ungated) |
| `/admin` | `app/(admin)/admin/page.tsx` | **Moderator-only:** hospital moderation queues + editor |

---

## 5. Onboarding (first-ever session)

**Goal:** a reachable identity + one saved artifact, minimum friction. **One text field
in the whole flow (email); everything else is tap-select.** Re-entry with an existing
profile redirects straight to `/reflections`.

Sequence (progress bar in parens): **Welcome (8%) → Context (30%) → Year (50%) →
Specialty (70%) → Acknowledgment (88%) → Success (100%)**.

1. **Welcome** — "Your placement, remembered — every shift, every year." Sub: "Write a
   short reflection, log the skills it surfaced, and Prac. maps it to your **NMBA
   standards** into a record you own. Free for your whole degree." CTA "Get started".
2. **Context** — "Where are you right now?" Three cards: 🏥 *On placement now* / 📅
   *Placement this semester* / 🧭 *Just looking around*. Routes the activation tone;
   transient (not persisted).
3. **Year** — "What year are you in?" Sub: "So your reflections map to the right **NMBA
   standards**." Chips: 1st / 2nd / 3rd / Final year / Postgrad → `profile.yearLevel`.
4. **Specialty** — "Which ward are you on?" (or "…coming up?"). Chips: Med-surg, Aged
   care, Mental health, Emergency, Paediatrics, Community, **Not sure yet**, **None of
   these** (kept distinct). → `placement.ward`.
5. **Acknowledgment** — "Your record, kept confidential." "Reflections are your
   professional record — not assessment evidence. Keep patient-identifiable details
   out; Prac. flags common ones, but the rest is on you." CTA "I understand — set me up".
6. **Success** — teal check; "You're set up." **The future-value seed appears once,
   only here:** 🌱 "Everything you log now quietly builds the record your final-year
   self uses for grad applications." CTA varies by context (write first reflection vs
   go to reflections).

Saved on completion: profile (`fullName` from email local-part, `nurseTrack: 'RN'`,
`yearLevel`, `taggingOn: true`, default reminder) + an active placement (skipped for
the "just looking around" path, which lands on an orientation screen instead).

---

## 6. Core loop — the real product

Component: **`src/ui/ReflectionEditor.tsx`** (used by both `/reflections/new` and
`/edit`). Order: **Reflect → Skills → NMBA mapping → Saved**. Mapping is deliberately
at the **end**, inferred — never a mid-flow manual gate.

### 6.1 Step 1 — Reflect ("Tonight's reflection.")

**Three soft prompts on one screen** (not gated screens):

- **What happened?** (required, ≥3 chars to advance) — _"One moment from today — what
  did you do or see?"_
- **So what?** (optional, "why it mattered") — _"Why did it matter? How did you feel,
  what did you learn?"_
- **Now what?** (optional) — _"What will you do differently next shift?"_

Plus a "Date of shift" picker (max today). **Inline identifier nudge** as they type
(§8): amber alert — _"Some details might identify someone (e.g. names, ages, bed
numbers). Consider 'the patient' or an initial — we'll ask again before you export."_

### 6.2 Step 2 — Skills ("What did you do?")

- Debounced search over the **skill library** (pre-tagged to standards). Tap to add;
  each logged skill shows its standard IDs.
- **New / Renewed is auto-detected from the student's own history** (Renewed if logged
  in any prior reflection), with a one-tap override — _"Auto-set from your history —
  tap to change."_ Never a manual toggle from scratch.
- **Free-text fallback:** _"Add '{query}' as free text — we'll match it to the library
  later."_ Stored in `rawText`, **queued for normalisation** — never written silently
  into the corpus.
- **Skill-only path** (`?mode=skill`): skips Step 1; logging skills is the
  high-frequency / low-effort behaviour and isn't trapped behind the full reflection.

### 6.3 Step 3 — Review & confirm ("Review & save.")

- Preview of the reflection + skill summary badges.
- **"Maps to NMBA standards"** with an "auto-suggested" badge: all 7 standards shown as
  toggles, **pre-selected** from `inferStandards()` (§8.2), editable. **Never select
  from 23 items cold; no 1–5 self-scoring** (that's the assessor's role).

### 6.4 Step 4 — Saved ("Saved.")

Teal check + e.g. "Reflection + 3 skills, mapped to 2 NMBA standards." **Corpus-growth
stats** (reflections / skills / standards out of 7). CTAs: view reflections / done.

### 6.5 State

**Autosave on every screen — non-negotiable.** 700ms debounce → Dexie immediately
(`status: 'draft'`), sync queued (non-blocking), `status: 'saved'` on final save.
Survives browser close and works offline.

---

## 7. Reflections hub, export gate, settings, sign-in, guides, admin

### 7.1 Reflections hub (`/reflections`)
Heading "Your reflections." + placement context + quiet mono stat ("3 · 2 of 7 std").
**Coverage is a quiet stat, never the organising frame** (avoids Goodhart). Two CTAs:
"Start a reflection." and "Just log a skill →". Conditional cards: ward-guide priming
(§9), a gentle weekly nudge, empty state ("Nothing logged yet. … Two minutes is enough
tonight."). List = soft-delete with undo toast.

### 7.2 Export + identifier gate (`/export`)
Three steps: **Scope → Gate → Ready.**
- **Scope:** placement + count, order toggle. Framed _"your reflective record. It's a
  record of your learning, not a competency assessment or proof of practice."_
- **Gate (mandatory, structural — between scope and file):** re-scans all reflections.
  Each flagged identifier forces a human decision — **Edit reflection** (→ editor) or
  **Not an identifier** (dismiss). Cannot generate while any flag is open. Honesty
  copy: _"Prac. catches common identifiers — names, ages, bed and room numbers, dates.
  It won't catch everything. What's left is yours to check before you share."_
- **Ready:** PDF (print-to-PDF) or text, on-device. Still honest: _"Checked for common
  identifiers. Anything we missed is yours to catch before you send this to anyone."_

### 7.3 Settings (`/settings`)
Reminders (day / time / channel), assistance toggle ("On-device tag suggestions" →
`taggingOn`), and a danger "Delete account & all content" (cascades server + clears
local Dexie, signs out).

### 7.4 Sign-in (`/sign-in`)
RN credibility header ("Built by a registered nurse"). Password mode **and**
passwordless OTP (email code). _Spec intent (§2/§7) is magic-link/passwordless for the
multi-year handoff; password is a dev-era convenience to revisit before v1._

### 7.5 Admin (`/admin`)
Moderator-only (`profiles.is_moderator`): the hospital-directory moderation queues
(pending tips + new-hospital requests) and the hospital editor (`HospitalAdmin`).

### 7.6 Public ward guide (`/guides/[slug]`)
See §9.

---

## 8. On-device logic (deterministic — no server, no LLM)

### 8.1 Identifier check — `src/tagging/identifiers.ts`
`scanIdentifiers(text)` → de-duped `IdentifierFlag[]` (status `'open'`). Pure &
synchronous so it runs as the student types and offline. **Structured identifiers
only**; the UI never claims completeness. On-device NER is a v2 recall upgrade.

```ts
const TITLES = '(?:Mr|Mrs|Ms|Miss|Dr|Sr|Prof)'
const PATTERNS = [
  { kind: 'age',   re: /\b\d{1,3}\s?(?:yo|y\/o|y\.o\.|year[- ]?old)s?\b/gi },
  { kind: 'bed',   re: /\b(?:bed|room|bay|cubicle)\s?\d+[a-z]?\b/gi },
  { kind: 'mrn',   re: /\b(?:mrn|ur|urn)\s?:?\s?\d{4,}\b/gi },
  { kind: 'phone', re: /\b0\d(?:[\s-]?\d){8}\b/g },
  { kind: 'mrn',   re: /\b\d{6,}\b/g },
  { kind: 'date',  re: /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g },
  { kind: 'name',  re: /\b{TITLES}\.?\s+[A-Z][a-zA-Z'’-]+\b/g }, // Dr Smith
  { kind: 'name',  re: /\b{TITLES}\.?\s+[A-Z]\b/g },             // Mrs K
]
```

### 8.2 NMBA mapping — `src/data/mapping.ts`
`inferStandards(skills, text)` is a **join, not inference**: union of standards carried
by logged skills (library pre-tagged) + a keyword→standard table over the text.
Deterministic and auditable ("why Standard 4?").

```ts
const KEYWORD_STANDARDS = [
  { re: /communicat|listen|rapport|famil|distress|therapeutic|reassur/i, standardId: 2 },
  { re: /assess|observation|\bobs\b|vital|history|examin|baseline/i,     standardId: 4 },
  { re: /plan|prioritis|prioritiz|\bgoal/i,                              standardId: 5 },
  { re: /medicat|administ|safe|escalat|deteriorat|polic|guideline|isbar/i, standardId: 6 },
  { re: /critical|notice|recognis|recogniz|evidence|question|judg/i,     standardId: 1 },
  { re: /evaluat|outcome|review|next time|differently|worked well/i,     standardId: 7 },
  { re: /scope|learn|wellbeing|capabilit|supervis/i,                     standardId: 3 },
]
```

NMBA standards (RN, 1–7): 1 Critical thinking · 2 Therapeutic & professional
relationships · 3 Capability for practice · 4 Comprehensive assessment · 5 Plan for
practice · 6 Safe, appropriate, responsive quality practice · 7 Evaluates outcomes.

---

## 9. Content assets

- **Ward guide** — `src/content/guides.ts`. A **funnel, not a library** (§6 of
  CLAUDE.md): texture, not facts. `Guide` shape: `{ slug, ward, emoji, readMins, title,
  intro, feel[], skills[{name, standard}], prompts[], byline{name, background} }`.
  **One guide built (`med-surg`)** — deliberate probe; don't add more. Sections: "What
  the days feel like", "Skills you'll probably touch" (standard-tagged), "Worth
  reflecting on", disclaimer ("general guidance from experience — not clinical
  instruction; follow your facility's protocols and your facilitator"), soft conversion
  CTA. **Byline is a `TODO(founder)` placeholder** — must become a verifiably real
  nurse (name + face + background); that authenticity is the SEO edge. `WARD_TO_GUIDE`
  maps an onboarding ward → slug for **in-app priming** on the hub.
- **Skill library + skill→ANSAT map** — `supabase/seed/skills_starter.sql` (~12 seed
  skills, ~16 mappings, med-surg/aged-care themed). Authoring the **real `skill→ANSAT
  item` table is the moat and the bottleneck** — clinician content only the founder can
  write.

---

## 10. Tech stack & structure

- **Next.js 15.5.19**, **React 19**, **Tailwind 3.4**, **TypeScript 5**.
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) for auth + corpus storage.
- **Dexie 4** (+ `dexie-react-hooks`) for local-first IndexedDB and offline.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, **`verify` = lint +
  typecheck + build** (must be GREEN before any commit/push).
- Layout: `/app` (routes), `/src/{auth,data,db,tagging,sync,export,content,ui,lib}`,
  `/supabase/{migrations,seed}`, `/designs` (HTML mockups), `/public`.

**Engineering guardrails to carry into new work:**
- **No `middleware.ts`** — auth gating is the client guard `src/auth/guard.tsx` wired
  into route-group layouts.
- **RLS on every table, deny-by-default, owner-scoped via `auth.uid()`.** Only the
  Supabase **anon key** ships to the browser; **service-role key never** in client code.
- **No reflection content / PII** in logs, analytics, or error payloads.
- Supabase-under-RLS + on-device processing means **few/zero serverless functions** —
  don't build an API layer you won't use.

---

## 11. Data model (Supabase; ANSAT naming is internal only)

`supabase/migrations/*.sql`; client mirror in `src/db/schema.ts`, types in
`src/data/types.ts`. RLS owner-scoped unless noted.

- **`profiles`** — `id` (=auth.users), `full_name`, `university_id`, `program`,
  `year_level`, `nurse_track` (RN|EN), `tagging_on`, reminder settings.
- **`reflections`** — `user_id`, `placement_id`, **`what_happened` / `so_what` /
  `now_what`** (now_what optional), `body`, **`status` (draft|saved)** for autosave,
  `reflected_on`, soft-delete `deleted_at`.
- **`skills_logged`** — `user_id`, `reflection_id?`, `skill_id?`, **`raw_text`**
  (free-text fallback), **`status` (new|renewed)**.
- **`identifier_flags`** — `user_id`, `reflection_id`, `label`, `kind`, **`status`
  (open|fixed|dismissed)** — so the "to review" pill persists.
- **`reflection_standards`** — reflection ↔ standard, with `item_code`.
- **`placements`** — `user_id`, `ward`, `hospital`, `start_date`, `end_date`, `status`.
- **Reference (world-readable):** `universities` (11 AU + Other), **`ansat_standards`
  (7)**, **`ansat_items` (23, e.g. "2.3")**, `skill_library`, `skill_ansat_map`.
- **Hospital directory:** `hospitals`, `hospital_reference_cards`, `hospital_tips`,
  `hospital_tip_votes`, `hospital_requests` — anonymous submit/vote via rate-limited
  SECURITY DEFINER RPCs; moderator-gated publish.

> Reference tables are served to the client; **the client computes the suggestion and
> runs the identifier check** (§8). `ansat_*` table/field names may use ANSAT
> terminology — the rendered UI never does.

---

## 12. Product & copy rules for new features (condensed do-not index)

- **Completion test outranks every feature** — don't add surface area before the core
  loop is shown to retain. No portfolio dashboard for v1 (payoff is back-loaded past
  the churn window).
- "ANSAT" → never in UI copy. "safe" / "de-identified" → never. State fallibility.
- NMBA mapping = **inferred, pre-selected, editable** at save — never a manual mid-flow
  gate, never the 23 items cold, never 1–5 self-scoring.
- New/Renewed = **auto-detected**, one-tap override — never a from-scratch toggle.
- Free-text skills = matched + **queued for normalisation** — never silently into the
  corpus.
- Genuine first reflection = **blank** — no pre-filled domain or worked example.
- Identifier check & NMBA mapping = **on-device, deterministic** — never a server/LLM.
- Ward guides = **funnel, not an in-app library**; never gate guide content behind
  email. One guide for now.
- Don't build an API layer Supabase-under-RLS makes unnecessary. Don't reintroduce
  middleware.

---

## 13. Open questions / founder TODOs (don't silently resolve)

From `CLAUDE.md` §7 + the decisions log:

- **Email-first / magic-link onboarding** (passwordless) vs the current password
  convenience — revisit before v1; affects the multi-year handoff.
- **Placement-start date capture** — the prep-guide return trigger is an empty promise
  without it. Add a tap-select date or change the copy.
- **The reflection trigger** (what actually opens the flow at 9pm — notification / home
  nudge / facilitator prompt). _Highest-value undesigned problem._
- **Offline save:** require connectivity vs queue locally.
- **Expo vs PWA** (native push leans Expo for re-engagement).
- **First-log domain mapping:** auto for the first log vs tap-select from the start.
- **Data-reusability:** pressure-test how much 1st-year prose survives as 4th-year
  selection-criteria evidence before over-investing in "log everything now."
- **Content moat:** the real `skill→ANSAT` map and the real ward-guide byline are
  founder-only work and currently seeded/placeholder.

---

## 14. Pointers

- **Rationale & binding rules:** `CLAUDE.md` (product spec §§0–8 + engineering Appendix
  A). On any conflict, `CLAUDE.md` wins.
- **Visual mockups:** `designs/onboarding.html`, `designs/reflection-flow.html`,
  `designs/history-export.html`, `designs/ward-guide-funnel.html`.
- **Key source by feature:** tokens `tailwind.config.ts` · primitives
  `src/ui/components.tsx` · shell `src/ui/AppShell.tsx` · core loop
  `src/ui/ReflectionEditor.tsx` · identifier check `src/tagging/identifiers.ts` ·
  mapping `src/data/mapping.ts` · types `src/data/types.ts` · guides
  `src/content/guides.ts` · schema `supabase/migrations/*`, `src/db/schema.ts`.
