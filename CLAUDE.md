# CLAUDE.md — Engineering guide for Prac

This file is the **binding contract** for how Prac is built. Read it at the start of
every session. Every change must satisfy the **Definition of Done** (§7) before it is
committed or pushed. When this file and a casual instruction conflict, this file wins
until it is deliberately changed.

These rules are written to be **product-agnostic where possible** (good practice for any
serious web app) and **specific where it matters** (this app handles confidential health
content). The simple rule of thumb: *the interface is small, the care goes into storage,
sync, privacy, and verification.*

---

## 1. What Prac is

A web-first, installable (PWA) clinical-reflection logging app for nursing students on
placement. Students capture short, dated, standard-tagged reflections — often offline —
and export a clean PDF for their university at the end. It handles confidential clinical
content, so privacy is a pass-or-fail property, not a feature.

Stack: **Next.js (App Router) on Vercel**, **Supabase** (Postgres + Auth + scheduled
functions, Sydney region), **Dexie/IndexedDB** for local-first storage.

---

## 2. Product invariants (NON-NEGOTIABLE)

These can never be violated by any change. If a task seems to require breaking one, stop
and ask the product owner.

1. **Reflection content and derived tags are sensitive personal information.** They never
   leave the device except as (a) encrypted sync to the owner's own account and (b) an
   export the student initiates.
2. **No content to any third party — ever.** Not to analytics, not to logs, not to error
   reporting, not to any cloud or LLM service, not to any administrator.
3. **Row Level Security is on for every table, from the first migration.** Content rows
   are readable only by their owner (`auth.uid()`).
4. **Admins get counts, never content.** Adherence metrics come only from a
   `security definer` function that returns aggregates. No admin path ever selects
   `reflections.body` or any tag.
5. **Data residency.** If the market is Australian, data lives in Australia
   (Supabase `ap-southeast-2`, Sydney).
6. **On-device only inference.** Tagging/sentiment runs client-side. Suggestions are
   confirmed by the student; nothing is applied silently; only confirmed tags are stored.

---

## 3. Architecture principles

- **Local-first, offline-first.** Every write lands in IndexedDB (Dexie) immediately and
  is queued for sync. Writing is never blocked on connectivity; no spinner ever prevents
  typing. Postgres is the durable cross-device source of truth; the device is the source
  of truth in the moment.
- **IndexedDB for content, localStorage only for tiny flags** (e.g. theme). Reflections
  are long text — never localStorage.
- **Sync is single-author per user.** Use `updated_at` + last-write-wins per record.
  Never silently drop a local write.
- **Foundation strong, surface small.** The schema models more than the v1 UI exposes
  (multiple placements, organizations, roles, educator-share). Growth must not require a
  rebuild. Do not delete this latent capacity to "simplify."
- **Seams, not forks.** All export goes through one `exportPlacement(format)`. All auth
  through one wrapper. Adding a format or provider must not touch callers.
- **Read reference data from tables, not hard-coded constants** (e.g. ANSAT standards
  filtered by `track`), so the Enrolled Nurse set can be added without an interface change.

---

## 4. Security & privacy engineering (health-data baseline)

- **Encrypt in transit and at rest.** Restrict every content row to its owner with RLS.
  Deny by default; grant the minimum.
- **No PII or content in logs or error payloads.** If an error reporter is ever added,
  scrub message bodies. Telemetry (if any) is anonymous event counts only, off by default,
  explicit opt-in.
- **Data minimization.** Collect only the onboarding fields the spec names. No contacts,
  no precise location, nothing not used by a named feature.
- **Soft delete + scheduled hard delete.** User content carries `deleted_at`. Provide and
  honour a real account-and-content deletion path.
- **Secrets live in environment variables, never in the repo.** The only key allowed in
  the client bundle is the Supabase **anon** key (`NEXT_PUBLIC_*`), which is safe *only
  because RLS is enforced*. The service-role key is never shipped to the browser.
- **The write screen persistently discourages patient-identifiable detail;** onboarding
  states this once.

---

## 5. Code quality standards

- **TypeScript strict. No implicit `any`.** Type the boundaries — especially third-party
  callbacks (this is what broke the first Vercel build). Avoid `any`; if unavoidable,
  justify it in a comment.
- **Small, pure functions** in `src/data`, `src/sync`, `src/tagging`, `src/export`. The
  data layer is the source of truth — avoid heavy global state.
- **Accessibility is a requirement, not a polish pass.** Dark theme following the system
  setting, dynamic type, **minimum 44px touch targets**, one-handed reach for write+save,
  semantic HTML, labelled controls. The app never loses text.
- **No dependency that ingests message content**, and none that requires reflection text
  to leave the device for anything but the student's own export.
- **Keep `package-lock.json` committed.** Installs must be reproducible.

---

## 6. Build & verification discipline (the anti-"broken build" rules)

The whole point of this section: **a build should never fail on Vercel for a reason we
could have caught locally.**

- **Before every commit/push, run `npm run verify` and see it GREEN.** This runs lint +
  typecheck + production build — the same things Vercel runs. No exceptions, even for
  "one-line" changes.
- **CI runs the same checks on every push** (`.github/workflows/ci.yml`). A red CI is
  never merged. CI is the safety net; local `verify` is the first line.
- **Treat security advisories as work.** When the build log flags a vulnerable dependency
  (e.g. a Next.js CVE), schedule the bump, apply it on its own branch/commit, and
  re-verify — don't let it rot.
- **Never commit `.env.local`, real keys, `node_modules`, or `.next`.** (Enforced by
  `.gitignore`.)

If `verify` cannot run (e.g. no network to install deps), say so explicitly in the reply
rather than pushing unverified — never claim a build passed that wasn't run.

---

## 7. Definition of Done (every change must pass this)

- [ ] `npm run verify` is **green** locally (lint, typecheck, build).
- [ ] No secrets, no reflection content, and no PII in code, logs, commits, or error paths.
- [ ] Any new table/column has RLS and respects the §2 invariants.
- [ ] UI changes meet the §5 accessibility bar.
- [ ] Committed with a clear, descriptive message and pushed to the feature branch.
- [ ] If anything was skipped or couldn't be verified, it's stated plainly in the reply.

---

## 8. Git & workflow discipline

- Develop on the designated feature branch (currently `claude/magical-hamilton-vugy39`).
  Never push to another branch without explicit permission.
- Descriptive commit messages: what changed and why. One logical change per commit where
  practical.
- Do not open a pull request unless explicitly asked.

---

## 9. Build sequence (from the spec) and current status

1. [x] **Scaffold** — Next.js, Supabase migration (all tables + RLS + admin metrics fn),
   seeds (universities, 7 RN ANSAT standards).
2. [ ] **Auth** — Supabase email one-time code, secure session, profile creation.
3. [ ] **Local-first data layer** — Dexie schema, repositories, sync queue. Prove an
   offline write survives reload and later syncs. *(Highest-risk milestone — do before
   interface polish.)*
4. [ ] **Write + list screens** — multi-standard tagging, continuous autosave.
5. [ ] **On-device tagging (tier one)** — lexicon suggestions, confirmed → stored tags.
6. [ ] **Export** — paginated PDF, then plain text.
7. [ ] **Onboarding** + confidentiality statement.
8. [ ] **Reminders** — weekly email function, in-app banner, settings.
9. [ ] **Admin** — organizations, invitations, roster, count-only metrics.
10. [ ] **Lifecycle/theme/a11y/empty states** + time-to-write pass.
11. [ ] **Verify every acceptance criterion** (spec §12).

---

## 10. Decisions log

- **2026-06-16** — Platform confirmed: web-first Next.js PWA on Vercel + Supabase.
- **2026-06-16** — Build broke on Vercel from an untyped `@supabase/ssr` cookie callback.
  Lesson encoded as §6: always run `npm run verify` before pushing. Added CI as a net.

---

*Keep this file current. When a decision is made, record it in §10 and update §9 status.*
