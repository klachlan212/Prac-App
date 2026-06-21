# Prac. — Architecture (as-built)

_Technical reference for how Prac. is put together. Companion to `CLAUDE.md` (the
product spec & engineering contract — the **why**) and `DESIGN.md` (the visual/UX
design reference — the **look**). This file is the **how**. Current as of the
`claude/confident-turing-wspzot` branch, migrations `0001`–`0011`._

---

## 1. Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js (App Router)** + **React** + **TypeScript** | Client-component heavy; route groups for auth scoping |
| Styling | **Tailwind CSS** | Design tokens in `globals.css`; primitives in `src/ui/components.tsx` |
| Local store | **Dexie** (IndexedDB) + `dexie-react-hooks` | Local-first; reactive reads via `useLiveQuery` |
| Backend | **Supabase** — Postgres + Auth + **Row-Level Security** | No bespoke API server; the browser talks to Postgres under RLS |
| Auth client | `@supabase/ssr` (`createBrowserClient`) | Anon key only in the browser; service-role key never client-side |
| Hosting | **Vercel** | Canonical prod URL in `CLAUDE.md` §A4; Deployment Protection ON |
| Quality gate | `npm run verify` | lint + typecheck + production build; CI runs the same |

**Mental model:** there is almost no traditional "backend code." The client reads
and writes Postgres directly; **RLS in the database decides who can see/do what.**
The only server-side logic is a handful of `SECURITY DEFINER` Postgres functions
(for anonymous writes) and one (currently undeployed) edge function.

---

## 2. The central idea: local-first + background sync

A student logs at 9pm, one-handed, on poor hospital wifi. So **nothing in the core
loop waits on the network.**

```
   ┌─────────────────────────── browser / device ───────────────────────────┐
   │                                                                          │
   │   UI (React)                                                             │
   │     │  write                         read (reactive)                     │
   │     ▼                                   ▲                                │
   │   src/data/*.ts ───► Dexie (IndexedDB) ─┘   useLiveQuery re-renders       │
   │     │                    │  on local change                              │
   │     │ enqueue            │                                               │
   │     ▼                    │                                               │
   │   syncQueue (Dexie) ─────┘                                               │
   │     │  flush() (background, when online)                                 │
   └─────┼────────────────────────────────────────────────────────────────────┘
         │  upsert / insert (anon key + user JWT)
         ▼
   Supabase Postgres  ◄── RLS gates every row by auth.uid()
         │
         │  pull(userId) on app load → merge server rows back into Dexie (LWW)
         ▼
   Dexie (rehydrated)
```

- **Writes** go to Dexie first (instant), then enqueue a job in the `syncQueue`
  table; a background `flush()` pushes to Postgres. Offline = the job waits.
- **Reads** use `useLiveQuery` — the UI re-renders the instant local data changes,
  never "fetch-and-spinner."
- **Autosave** is a consequence: the editor writes a draft to Dexie every ~700ms.
- **Conflict policy:** last-write-wins on `updated_at` (single author, usually one
  device — see the returning-user note in §6).

---

## 3. Repository layout

```
app/                                 # Next.js App Router
  layout.tsx                         # root: fonts, <html>
  page.tsx                           # "/" → redirect to /sign-in
  globals.css                        # Tailwind + design tokens
  (student)/layout.tsx               # wraps children in <AuthGuard>
  (student)/sign-in/                 # auth (password + OTP)
  (student)/onboarding/              # first-run setup
  (student)/reflections/             # Home (dashboard) + /new + /[id]/edit
  (student)/history/                 # filterable record
  (student)/export/                  # export + identifier gate
  (student)/settings/                # reminders, assistance, account
  (student)/profile/                 # hub: history, export, settings, sign out
  (student)/resources/               # hub: hospitals, specialties (placeholder)
  (admin)/layout.tsx                 # <AuthGuard>
  (admin)/admin/                     # moderator-only tools
  hospitals/  guides/[slug]/         # PUBLIC (no guard) — shareable/SEO

src/
  auth/        client.ts useUser.ts guard.tsx     # Supabase client + session hook + nav guard
  data/        profile placements reflections skills standards mapping hospitals  types ids
  db/          schema.ts                          # Dexie tables
  sync/        engine.ts queue.ts useSync.ts      # push/pull, queue, status hook
  tagging/     identifiers.ts lexicon.ts          # on-device identifier scan
  export/      exportPlacement.ts                 # client-side PDF/text
  ui/          AppShell.tsx components.tsx ReflectionEditor.tsx hospital/*
  content/     guides.ts hospitals.ts             # authored content + static metadata
  lib/         localSettings.ts                   # theme/reminder-channel (localStorage)

supabase/
  migrations/  0001 … 0011 .sql
  functions/   weekly-reminder/index.ts           # edge function (NOT deployed)
```

---

## 4. Frontend

### Routing & auth scoping
Next.js **route groups** (parenthesised folders, not in the URL):
- `app/(student)/*` and `app/(admin)/*` are wrapped by **`AuthGuard`** (`src/auth/guard.tsx`).
- `app/hospitals/*`, `app/guides/*`, `app/page.tsx` are **public** (no guard) so they're shareable and crawlable.

### Auth guard (no middleware — important)
A Next.js `middleware.ts` was tried and **500'd on Vercel's Edge runtime in every
form**, so it was removed permanently. Auth redirects live in the client component
`AuthGuard`, which only checks *session existence* and renders nothing until the
check resolves (no protected-content flash). It is a **navigation convenience, not
the security boundary** — RLS is, and protected pages render from the local store,
so an unauthenticated visitor sees no data regardless. `useUser` (`src/auth/useUser.ts`)
exposes the current session user; both have `.catch` fallbacks so a network blip
can't hang the UI on a blank screen.

### Navigation shell
`src/ui/AppShell.tsx`: a top header (brand + live sync-status dot) and a **bottom
tab bar** — `[Home] [Reflect] [Resources] [Profile]`. Resources and Profile are
*hubs* so new sections scale without new tabs. `/admin` and the public
`/hospitals`/`/guides` render their own headers.

### Component system
`src/ui/components.tsx` — `Button`, `Card`, `Field`, `Input`, `TapChip`, etc. All
≥44px touch targets, shared radii/shadows, light-mode only. Screens compose these,
"one decision per screen."

### Key screens / state machines
- **Onboarding** (`onboarding/page.tsx`): `welcome → context → year → specialty →
  ack → success`. Email is captured earlier at **sign-in**, so onboarding is
  tap-select only. "Just looking around" branches to an orientation success screen
  and skips creating a placeholder placement.
- **Reflect flow** (`src/ui/ReflectionEditor.tsx`): `reflect → skills → review →
  saved`, with Back navigation, autosave, inline identifier nudge, auto New/Renewed
  from history, and inferred-then-editable NMBA mapping. `?mode=skill` starts at the
  skills step (standalone "just log a skill").
- **History** (`history/page.tsx`): in-memory filtering (NMBA standard, New/Renewed,
  recency) over a `useLiveQuery` spanning all placements.
- **Export** (`export/page.tsx`): `scope → gate → ready`. The identifier gate is
  structural — you cannot reach file generation with open flags.

---

## 5. Local data layer (Dexie)

`src/db/schema.ts` defines the IndexedDB tables (profile, placements, reflections,
syncQueue, …). The `src/data/*.ts` modules are the only things that touch Dexie:

- Each write: update Dexie → `enqueue()` a sync op (`src/sync/queue.ts`) → fire
  `flush()`.
- `getProfile` (`src/data/profile.ts`) falls back to a **server fetch** when the
  local profile is missing (returning user on a new device) so they aren't bounced
  back through onboarding.
- `getOrCreateActivePlacement` (`src/data/placements.ts`) guarantees the loop always
  has a placement to attach to (no silent "Saved" with nothing persisted).
- Reference data (`standards.ts`, `skills.ts`) is fetched from Postgres and cached
  in-memory; a failed/empty fetch is **not** cached (so it retries).

---

## 6. Sync engine (`src/sync/`)

- **`flush()`** drains `syncQueue` oldest-first, pushing each entity to Postgres;
  on error it defers and retries next flush (no content is ever logged).
- **`pull(userId)`** fetches the user's `profiles`, `placements`, and `reflections`
  (with their standards/tags/skills/flags) and merges into Dexie, last-write-wins by
  `updated_at` + local `synced` flag.
- **`useSync(userId)`** (`useSync.ts`) runs `pull` on mount and surfaces a sync state
  (`offline | syncing | pending | synced`) for the header dot.
- Item-level NMBA codes (e.g. `4.2`) are persisted per standard on push (matched by
  ordinal), so 23-item granularity survives a device switch.

---

## 7. Backend (Supabase / Postgres)

### 7.1 Data model & RLS reference

Every table has RLS enabled. `auth.uid()` is the caller's user id, derived from
their session token by Postgres (un-forgeable). Owner tables also grant full DML to
`anon`/`authenticated` (Supabase default) but RLS gates the rows; **read-only
reference tables additionally have write DML revoked** (defense-in-depth, `0008`).

| Table | Read | Write | Notes |
|---|---|---|---|
| `profiles` | owner (`id = auth.uid()`) | owner | one row per user |
| `placements` | owner | owner | active/archived |
| `reflections` | owner | owner | length `CHECK ≤ 10000` per field (`0008`) |
| `reflection_standards` | owner via parent | owner via parent | `(reflection_id, standard_id, item_code)` |
| `reflection_tags` | owner | owner | derived tags |
| `skills_logged` | owner | owner | `reflection_id` null = standalone skill log |
| `identifier_flags` | owner | owner | the "to review" pill state |
| `universities` | world (SELECT) | **revoked** | reference |
| `ansat_standards` (7) | world | **revoked** | rendered as "NMBA standards" |
| `ansat_items` (23) | world | **revoked** | e.g. `2.3` |
| `skill_library` | world | **revoked** | pre-tagged to ANSAT items |
| `skill_ansat_map` | world | **revoked** | the mapping moat |
| `hospitals` | world | moderator | `profiles.is_moderator` |
| `hospital_reference_cards` | world | moderator | `source_url` http(s)-validated on write |
| `hospital_tips` | published-or-moderator | moderator (update); **insert via RPC only** | moderation queue |
| `hospital_tip_votes` | — | — | RLS **no policy** = deny-all; RPC-only |
| `hospital_requests` | moderator | moderator (update); **insert via RPC only** | "request a hospital" queue |
| `anon_action_log` | — | — | RLS no policy + grants revoked; throttle ledger, definer-only |

> Removed in `0011`: `organizations`, `memberships`, `invitations` (unused
> cohort-admin system).

### 7.2 RPCs (`SECURITY DEFINER`, `search_path = ''`)

These are the only "server logic." They run with owner privileges, validate input
server-side, and are the **only** way anonymous users write.

| Function | Callable by | Purpose / guard |
|---|---|---|
| `submit_hospital_tip(…, p_token)` | anon, authenticated | Queue a tip (`status='pending'`). Rate-limited **10/hour per device token**; validates category/length/date. |
| `request_hospital(…, p_token)` | anon, authenticated | Queue a hospital request. Shares the 10/hour submit bucket. |
| `cast_hospital_vote(p_tip, p_token, p_dir)` | anon, authenticated | Toggle a vote, deduped by device token. Rate-limited **60/hour**. |
| `set_updated_at()` | trigger | Stamps `updated_at`; used by 7 tables. |

Rate limiting is **best-effort**: a device token is client-generated and bypassable
by minting new ones — it raises the bar without a CAPTCHA; the moderation gate
remains the real guard.

### 7.3 On-device, deterministic engines (NOT an LLM, NOT a server)

- **Identifier scan** — `src/tagging/identifiers.ts`: regex for ages (`84yo`),
  bed/room, MRN-style digit runs, dates, phones, Title+Name. Runs in the browser as
  you type. **Clinical text never leaves the device for this check.**
- **NMBA mapping** — `src/data/mapping.ts`: a *join, not inference* — union of
  standards from logged skills (pre-tagged to ANSAT items) + a keyword→standard
  table over the reflection text. Deterministic, free, offline, **auditable**
  ("why Standard 4?").

> Naming rule: the data model uses **ANSAT** (7 domains / 23 items) internally for
> granularity; the UI **always** says "NMBA standards" — never "ANSAT."

---

## 8. The core loop, end to end

1. Student types → every ~700ms `saveReflection()` writes a **draft** to Dexie +
   enqueues a sync op.
2. `scanIdentifiers()` flags likely identifiers inline (on-device).
3. Skills: `addSkill()` auto-sets **New/Renewed** from the student's *saved* history.
4. Review: `inferStandards()` pre-selects standards (join + keywords); student edits.
5. Save → status `saved`; success screen shows the corpus growing.
6. Background `flush()` pushes the reflection + standards (with `item_code`) + skills
   + flags to Postgres under RLS.
7. Export later: the gate re-scans, forces a decision per flag, builds an HTML doc and
   triggers print-to-PDF (`src/export/exportPlacement.ts`) — fully client-side. The
   exported body includes all three prompts (what/so-what/now-what).

---

## 9. Security model (summary)

- RLS on **all** tables; users reach only their own rows; identity server-derived.
- **Only the anon key** ships to the browser (safe because RLS holds); **service-role
  key never** in client code (only in the undeployed edge function via `Deno.env`).
- Identifier + mapping logic is **on-device & deterministic** — no PII/clinical text
  to any server, LLM, log, or analytics payload.
- All `SECURITY DEFINER` functions pin `search_path = ''`.
- Anonymous writes are validation- + moderation- + **rate-limit**-gated.
- Honesty copy: the UI never says data is "safe"/"de-identified"; the identifier gate
  states its own fallibility on-screen.
- `npm audit`: clean. See the full audit + remediations in the git history
  (migrations `0008`–`0011`).
- **Remaining (founder-side):** leaked-password protection (needs **Pro plan**) and a
  login CAPTCHA (provider key + client wiring).

---

## 10. Migrations

| # | Name | What |
|---|---|---|
| 0001 | initial | profiles, placements, reflections (+ standards/tags), universities, ansat_standards; RLS |
| 0002 | admin | org RPCs — **removed by 0011** |
| 0003 | skills_loop | 3-prompt reflection + draft state, `ansat_items` (23), `skill_library`, `skill_ansat_map`, `skills_logged`, `identifier_flags` |
| 0004 | hospitals | hospital directory tables + anonymous submit/vote RPCs |
| 0005 | hospital_moderation_writes | moderator add/edit RLS for hospitals + reference cards |
| 0006 | hospital_state | `hospitals.state` (+ state filter UI) |
| 0007 | hospital_requests | "request a hospital" table + `request_hospital` RPC |
| 0008 | security_hardening | revoke reference-table write grants; pin `search_path` on 3 fns; reflection length CHECKs |
| 0009 | set_updated_at_search_path | pin `search_path` on the trigger fn (last mutable-search_path) |
| 0010 | anon_rate_limit | `anon_action_log` + per-device rate limits on the 3 anon RPCs |
| 0011 | remove_organizations | drop `organizations`/`memberships`/`invitations` + their RPCs |

---

## 11. Build, deploy & runtime notes

- `npm run verify` = lint + typecheck + production build; must be green before commit.
- **No `middleware.ts`** — it 500'd on Edge; do not reintroduce. Gate in client/server
  components instead.
- Keep Node-only deps out of any Edge bundle.
- Hosted on Vercel (project `prac-app`); production `main` is currently **untouched** —
  all of the above lives on the feature branch awaiting a ship decision.
- The `weekly-reminder` edge function exists but is **not deployed** and nothing
  schedules it (the "reflection trigger" is an open product problem).

---

## 12. Where to read first
- `CLAUDE.md` — product spec + engineering contract (the *why*; binding).
- `DESIGN.md` — design system + per-screen reference (the *look*).
- `src/sync/engine.ts` — local-first sync in ~250 lines.
- `src/ui/ReflectionEditor.tsx` — the core loop as a state machine.
- `supabase/migrations/0001_initial.sql` + `0003_skills_loop.sql` — data model + RLS patterns.
- `src/data/mapping.ts` + `src/tagging/identifiers.ts` — the deterministic on-device engines.

---

## 13. Open / not built
- Real `skill → ANSAT` mapping content + a verifiable ward-guide byline (founder; the moat).
- The reflection trigger / reminders (highest-value open product problem).
- Magic-link login (spec wants it for the multi-year handoff; password is interim).
- Login CAPTCHA + leaked-password protection (needs Pro plan).
- Production promotion + the completion test (real students finishing the loop twice).
