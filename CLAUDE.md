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

## 4. Security & privacy — the first lens on everything

Security and least-privilege access are the **primary design constraint** of this product,
not an afterthought. **Apply this lens to every feature, every table, every endpoint, and
every dependency — by default, without being asked.** When a new feature is discussed, the
first questions are always:

> *Who can read this? Who can write this? What is the least access that makes it work?
> Where does the data live and travel? What happens to it on delete? What breaks if the
> client is malicious or an admin session is stolen?*

If a feature can't answer those, it isn't ready to build. Surface the security implications
of any new feature **proactively**, as part of proposing it — don't wait to be asked.

### 4.1 Access control — least privilege, deny by default

- **Every user can access only their own data — and only the operations their role allows.**
  Authorization is enforced in the database with Row Level Security, never only in the UI.
  A compromised client, a forged request, or a stolen admin session must still hit a wall
  at the database.
- **Deny by default.** A new table ships with RLS enabled and *no* policy, then we add the
  narrowest policy the feature needs. Never open a table "just for now."
- **Owner-scoped content** (`profiles`, `placements`, `reflections`, `reflection_standards`,
  `reflection_tags`) grants a row only when it belongs to `auth.uid()`.
- **Role-scoped metadata** (organizations, memberships, invitations) uses role-aware
  policies; an admin only ever reaches organizations they actually administer.
- **Admins never reach content** — not reflections, tags, or exports, by any path. Admin
  metrics come solely from a `security definer` function that returns counts. Verify this
  with a second account before any admin feature is called done.
- **Never trust client-supplied identity or authority.** Role, `org_id`, and `user_id` are
  derived from the session server-side, never accepted from the request. This is how
  privilege escalation is made impossible by construction.
- **The service-role key never touches the browser.** Only the anon key ships client-side,
  and it is safe *only because* RLS holds.

### 4.2 Data protection

- Encrypt in transit and at rest. Treat reflection content and derived tags as the most
  sensitive class of data in the system.
- **No PII and no content in logs, analytics, or error payloads — ever.** If an error
  reporter is added, scrub message bodies. Telemetry is anonymous counts only, off by
  default, explicit opt-in.
- **Data minimization.** Collect only the named onboarding fields. No contacts, no precise
  location, nothing not used by a shipped feature.
- **Deletion is real.** Soft delete with a recovery window, then scheduled hard delete.
  Honour a genuine account-and-content deletion path.
- **Australian data residency** (Supabase Sydney) while the market is Australian.

### 4.3 Secrets & supply chain

- Secrets live only in environment variables — never in the repo or the client bundle.
- **Patch security issues immediately and automatically — never ask permission to fix a
  known vulnerability.** When a build log, `npm audit`, or an advisory flags a vulnerable
  dependency, bump it to the nearest safe patched version on its own commit, re-run
  `npm run verify`, and push. Prefer the minimal in-line patch (same major/minor) over a
  risky major jump. Escalate *only* if the sole available fix is a breaking major upgrade —
  and even then, lead with the recommendation to take it.
- Keep `package-lock.json` committed so installs are reproducible and auditable.

### 4.4 In the product

- The write screen persistently discourages patient-identifiable detail; onboarding states
  the expectation once.
- Before any feature touching content, sharing, or admin visibility is called done,
  re-read §2 and this section and confirm nothing is weakened.

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
- [ ] **Access control reviewed (§4.1):** users reach only their own data; any new table is
      deny-by-default with the narrowest RLS policy; no admin path can reach content;
      identity/role is derived server-side, never trusted from the client.
- [ ] No secrets, no reflection content, and no PII in code, logs, commits, or error paths.
- [ ] No new or known-vulnerable dependency introduced; advisories patched (§4.3).
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
- **2026-06-16** — Security elevated to the primary design lens (§4 rewritten): explicit
  least-privilege access model, deny-by-default RLS, server-derived identity, and a standing
  rule to **auto-patch security advisories without asking**.
- **2026-06-16** — Security patch pass. `npm audit` showed Next.js `15.3.x` still carried
  many high-severity advisories (SSRF, cache poisoning, XSS, DoS), so patched Next.js
  `15.3.3` → `15.5.19` (same major, minor bump) and forced `postcss` `>=8.5.10` via an
  `overrides` block (fixes the copy bundled inside Next.js too). `npm audit` now reports
  **0 vulnerabilities**; `npm run verify` green. Lesson: trust `npm audit`, not just the
  build log — and `npm audit fix --force` can suggest absurd downgrades; patch deliberately.

---

*Keep this file current. When a decision is made, record it in §10 and update §9 status.*
