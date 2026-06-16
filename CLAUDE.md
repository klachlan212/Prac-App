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
- **A green build is necessary, not sufficient — mind the runtime, not just the compile.**
  Code can build cleanly and still crash on the runtime it actually deploys to. The classic
  trap here: **Next.js middleware runs on the Edge runtime by default**, where Node-only
  globals and APIs (`__dirname`, `process.version`, `fs`, `path`, most of `node:*`) do not
  exist. A dependency that uses them compiles fine (often just a *warning* like "A Node.js
  API is used … not supported in the Edge Runtime") and then throws at request time —
  `MIDDLEWARE_INVOCATION_FAILED` / `ReferenceError: __dirname is not defined` — on a build
  Vercel reported as successful. Treat Edge-runtime warnings as errors. The right fix is to
  **keep Node-only deps out of the middleware bundle**: middleware should do only cheap,
  Edge-safe work (read cookies/headers, redirect) and never import a heavy client like
  `@supabase/ssr` (which pulls in the full `@supabase/supabase-js`). Push real auth to where
  it belongs — Postgres RLS and the server-side Supabase client used by pages/route handlers
  (which run on the Node serverless runtime). **Do not reach for `runtime: 'nodejs'` on
  middleware as the escape hatch:** on Vercel it can fail a different way — the function is
  emitted as CommonJS `middleware.js` containing ESM `import`s and dies with "Cannot use
  import statement outside a module". The general rule: **know which runtime each file
  deploys to (Edge vs Node vs browser), and confirm its imports are legal there** — the
  build won't always tell you. **On this project, even a dependency-free Edge middleware
  still failed with `MIDDLEWARE_INVOCATION_FAILED` on Vercel**, so the middleware was removed
  entirely and the auth redirect moved to a client guard (`src/auth/guard.tsx`). If Vercel
  middleware misbehaves inexplicably, prefer client-/server-component gating over fighting
  the middleware runtime — there is no app feature that *requires* middleware here.
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

- [ ] `npm run verify` is **green** locally (lint, typecheck, build) — *and* any code that
      deploys to the Edge runtime (notably `middleware.ts`) is free of Node-only APIs and
      heavy clients (§6 runtime-quirk rule). A green build ≠ a working deploy.
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

- Develop on the designated feature branch (currently `claude/confident-turing-wspzot`).
  Never push to another branch — especially `main` (production) — without explicit
  permission.
- Descriptive commit messages: what changed and why. One logical change per commit where
  practical.
- Do not open a pull request unless explicitly asked.

### 8.1 Operator context — who you're working with

The product owner is **not deeply versed in Vercel or Supabase** (infrastructure,
deployments, branches, env vars, DNS, build settings). Treat that as a standing fact, not
a one-off. It changes how you work:

- **Inspect and act yourself.** Use the MCP tools (Supabase, GitHub) and the local git
  state to find out the real situation before reporting — don't hand the operator raw infra
  tasks ("go check your Vercel production branch") as if they'll know how. Within the branch
  rules above, make the necessary infra changes directly; for anything outward-facing or
  hard to reverse (e.g. pushing to `main`/production), explain it and get a yes first, but
  come with the change *prepared*, not as homework for them.
- **When you must explain, explain in depth and in plain language.** Spell out what the
  thing is, why it's the cause, and what the fix does — assume no prior Vercel/Supabase
  knowledge. "What you're lacking" answers are welcome and should be thorough.
- Never assume an infra concept is understood. A short glossary beats a bare term.

---

## 9. Build sequence (from the spec) and current status

1. [x] **Scaffold** — Next.js, Supabase migration (all tables + RLS + admin metrics fn),
   seeds (universities, 7 RN ANSAT standards).
2. [x] **Auth** — Supabase email one-time code, session middleware, profile creation.
3. [x] **Local-first data layer** — Dexie schema, repositories, sync queue + engine
   (push with join-table fan-out, pull with last-write-wins).
4. [x] **Write + list screens** — multi-standard tagging, continuous autosave, soft
   delete with undo.
5. [x] **On-device tagging (tier one)** — local lexicon suggestions, confirmed → stored.
6. [x] **Export** — paginated PDF (print) + plain text via one `exportPlacement` seam.
7. [x] **Onboarding** + one-time confidentiality acknowledgement + invite acceptance.
8. [x] **Reminders** — in-app weekly banner, settings; weekly email Edge Function written
   (`supabase/functions/weekly-reminder`, deploy + cron pending — see file header).
9. [x] **Admin** — org bootstrap, invitations, roster, count-only adherence metrics.
10. [~] **Lifecycle/theme/a11y/empty states** — placement archive, dark theme, 44px
    targets, empty states done; dedicated time-to-write pass still to do.
11. [ ] **Verify every acceptance criterion** (spec §12) — needs migrations run + a manual
    pass with two accounts (esp. the RLS/admin no-content checks).

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
- **2026-06-16** — Database migrations + seeds applied to Supabase project
  `kkytglabcwevvnjmmrhy` (`prac-app-database`, region `ap-southeast-2` Sydney). Verified:
  10 tables RLS-enabled, 11 universities, 7 ANSAT standards, all 4 functions present.
  Security advisor flags pending (mutable `search_path` on the 3 SECURITY DEFINER functions;
  `organizations` RLS-enabled-no-policy). Supabase migration-history table is empty (schema
  was applied via raw SQL, not `apply_migration`).
- **2026-06-16** — Operator context codified (§8.1): product owner is not versed in
  Vercel/Supabase, so Claude inspects/changes infra itself and explains in depth.
- **2026-06-16** — **Production-deploy gap found.** `main` (Vercel's production branch) is
  NOT the Next.js app — it's a static "Hello World" `index.html` placeholder pinned by a
  `vercel.json` (`@vercel/static`) with hardcoded `YOUR_SUPABASE_URL` placeholders. The real
  app lives only on the feature branch and has never been promoted to production, so adding
  env vars in Vercel changed nothing the user could see. Fix requires putting the app on the
  production branch and removing the static `vercel.json`/`index.html` so Vercel builds
  Next.js. (Resolved when the owner merged the app to `main` via PR #2.)
- **2026-06-16** — **`MIDDLEWARE_INVOCATION_FAILED` on production.** Once the real app was on
  `main`, every request 500'd with `ReferenceError: __dirname is not defined`. Root cause:
  `middleware.ts` imports `createServerClient` from `@supabase/ssr`, which bundles the full
  `@supabase/supabase-js` (uses `process.version`/`__dirname`); Next.js runs middleware on the
  **Edge runtime** by default, where those Node globals don't exist. The build only *warned*
  about `process.version` and otherwise passed — a green build, broken deploy. Fix: pin the
  middleware to the Node.js runtime (`runtime: 'nodejs'`, stable since Next 15.5) and wrap the
  `getUser()` call in try/catch (fail to null user → protected paths go to /sign-in). Lesson
  encoded in §6: a green build is not a working deploy; mind the Edge-vs-Node runtime.
- **2026-06-16** — **Correction: the Node.js-runtime middleware fix above also failed on
  Vercel.** Pinning middleware to `runtime: 'nodejs'` got past the `__dirname` Edge crash, but
  Vercel then emitted the function as CommonJS `middleware.js` holding ESM `import`s →
  `SyntaxError: Cannot use import statement outside a module` (loading `/var/task/middleware.js`).
  Real fix: **drop `@supabase/ssr` from the middleware entirely** and gate on the Edge runtime
  using only the presence of Supabase's `sb-<ref>-auth-token` cookie (excluding the transient
  `-code-verifier` cookie). Middleware bundle dropped 90 kB → 34 kB, no Node deps, no runtime
  override. Auth is still enforced for real by RLS + the server-side Supabase client on each
  page; the middleware is just a UX redirect. §6 updated to say: keep heavy clients out of
  middleware, don't use `runtime: 'nodejs'` as an escape hatch.
- **2026-06-16** — **Middleware removed entirely.** Even the dependency-free Edge cookie gate
  still 500'd on Vercel with `MIDDLEWARE_INVOCATION_FAILED` across every recent deployment, so
  the cause is the middleware mechanism on this project, not its contents. Deleted
  `middleware.ts` and moved the auth redirect to a client guard (`src/auth/guard.tsx`) wired
  into the `(student)` and `(admin)` layouts: it reads the Supabase session client-side and
  redirects unauthenticated users to `/sign-in` (and signed-in users away from it). No content
  leaks — protected pages render from the per-device local store, and Postgres RLS remains the
  real boundary. Net: no middleware = the error class is gone by construction. Also clarified
  the recurring symptom that each Vercel deployment keeps a frozen per-deployment URL; test the
  canonical production domain, not an old `…-<hash>.vercel.app` link.

---

*Keep this file current. When a decision is made, record it in §10 and update §9 status.*
