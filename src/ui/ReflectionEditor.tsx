'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/src/db/schema'
import { useUser } from '@/src/auth/useUser'
import { getProfile } from '@/src/data/profile'
import { getOrCreateActivePlacement } from '@/src/data/placements'
import { getReflection, saveReflection } from '@/src/data/reflections'
import { getStandards } from '@/src/data/standards'
import { getSkillLibrary, getAnsatItems } from '@/src/data/skills'
import { inferStandards } from '@/src/data/mapping'
import { scanIdentifiers } from '@/src/tagging/identifiers'
import { newId, todayISO } from '@/src/data/ids'
import type {
  AnsatStandard,
  AnsatItem,
  SkillLibraryEntry,
  LoggedSkill,
} from '@/src/data/types'
import { AppShell } from './AppShell'
import { Button, Card, Field, Input } from './components'

type Step = 'reflect' | 'skills' | 'review' | 'saved'

// The core loop (spec §3): Reflection → Skills → NMBA mapping → Saved.
// Three soft prompts on one screen, autosave throughout, mapping inferred and
// confirmed at the end (never selected cold). `mode='skill'` is the standalone
// "just log a skill" path — it skips the reflection prompts.
export function ReflectionEditor({
  reflectionId,
  mode = 'full',
}: {
  reflectionId?: string
  mode?: 'full' | 'skill'
}) {
  const router = useRouter()
  const { user, loading } = useUser()

  const idRef = useRef<string>(reflectionId ?? newId())
  // Standards we've already auto-applied from inference, so going back to Skills,
  // adding one, and returning to Review merges the NEW suggestion without
  // re-adding standards the student deliberately removed.
  const appliedSuggestions = useRef<Set<number>>(new Set())
  const [placementId, setPlacementId] = useState<string | null>(null)
  const [standards, setStandards] = useState<AnsatStandard[]>([])
  const [items, setItems] = useState<AnsatItem[]>([])
  const [library, setLibrary] = useState<SkillLibraryEntry[]>([])
  const [priorSkillIds, setPriorSkillIds] = useState<Set<string>>(new Set())
  const [dismissedLabels, setDismissedLabels] = useState<Set<string>>(new Set())
  const [taggingOn, setTaggingOn] = useState(true)
  const [ready, setReady] = useState(false)

  const [step, setStep] = useState<Step>(mode === 'skill' ? 'skills' : 'reflect')
  const [whatHappened, setWhatHappened] = useState('')
  const [soWhat, setSoWhat] = useState('')
  const [nowWhat, setNowWhat] = useState('')
  const [reflectedOn, setReflectedOn] = useState(todayISO())
  const [skills, setSkills] = useState<LoggedSkill[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    void (async () => {
      const profile = await getProfile(user.id)
      if (!profile) {
        router.replace('/onboarding')
        return
      }
      const [stds, its, lib] = await Promise.all([
        getStandards(profile.nurseTrack),
        getAnsatItems(),
        getSkillLibrary(profile.nurseTrack),
      ])
      setStandards(stds)
      setItems(its)
      setLibrary(lib)
      setTaggingOn(profile.taggingOn)
      // Always resolve to a real placement so a reflection is never dropped.
      const active = await getOrCreateActivePlacement(user.id)
      setPlacementId(active.id)

      // New/Renewed is auto-set from the student's own history (spec §3) — only
      // SAVED reflections count, never in-progress drafts (autosave writes a draft
      // on every keystroke, which would otherwise mislabel a skill as "Renewed").
      const prior = new Set<string>()
      const all = await db.reflections.where('userId').equals(user.id).toArray()
      for (const r of all) {
        if (r.id === idRef.current) continue
        if (r.status !== 'saved' || r.deletedAt) continue
        for (const s of r.skills ?? []) if (s.skillId) prior.add(s.skillId)
      }
      setPriorSkillIds(prior)

      if (reflectionId) {
        const existing = await getReflection(reflectionId)
        if (existing) {
          setWhatHappened(existing.whatHappened ?? existing.body ?? '')
          setSoWhat(existing.soWhat ?? '')
          setNowWhat(existing.nowWhat ?? '')
          setReflectedOn(existing.reflectedOn)
          setSkills(existing.skills ?? [])
          setSelected(new Set(existing.standardIds))
          // Preserve identifier dismissals across edits — otherwise the next
          // autosave wipes them and the export gate re-flags the same details.
          setDismissedLabels(
            new Set(
              (existing.identifierFlags ?? [])
                .filter((f) => f.status === 'dismissed')
                .map((f) => f.label.toLowerCase())
            )
          )
          appliedSuggestions.current = new Set(existing.standardIds)
        }
      }
      setReady(true)
    })()
  }, [user, reflectionId, router])

  const text = useMemo(
    () => [whatHappened, soWhat, nowWhat].filter(Boolean).join('\n'),
    [whatHappened, soWhat, nowWhat]
  )
  const flags = useMemo(() => scanIdentifiers(text), [text])
  // Re-apply any prior dismissals so they survive autosave (the gate's decisions
  // are sticky); the writing-time nudge only shows still-open flags.
  const flagsToSave = useMemo(
    () =>
      flags.map((f) =>
        dismissedLabels.has(f.label.toLowerCase()) ? { ...f, status: 'dismissed' as const } : f
      ),
    [flags, dismissedLabels]
  )
  const openFlags = useMemo(() => flagsToSave.filter((f) => f.status === 'open'), [flagsToSave])
  const suggested = useMemo(() => inferStandards(skills, text), [skills, text])
  // Item-level codes (e.g. "4.2") from the logged skills, persisted so the
  // 23-item granularity survives a sync / device switch (matched to each standard
  // at push time). Auditable: answers "why Standard 4?".
  const reflectionItemCodes = useMemo(
    () => [...new Set(skills.flatMap((s) => s.itemCodes))],
    [skills]
  )

  const stdById = useMemo(() => new Map(standards.map((s) => [s.id, s])), [standards])
  const itemByCode = useMemo(() => new Map(items.map((i) => [i.code, i])), [items])
  const itemForStd = useMemo(() => {
    const m = new Map<number, string>()
    for (const sk of skills)
      for (const code of sk.itemCodes) {
        const it = itemByCode.get(code)
        if (it && !m.has(it.standardId)) m.set(it.standardId, code)
      }
    return m
  }, [skills, itemByCode])

  // Continuous autosave (draft) so a half-written reflection survives interruption.
  useEffect(() => {
    if (!ready || !user || !placementId || step === 'saved') return
    const h = setTimeout(() => {
      void saveReflection({
        id: idRef.current,
        placementId,
        userId: user.id,
        whatHappened,
        soWhat,
        nowWhat,
        reflectedOn,
        standardIds: [...selected],
        itemCodes: reflectionItemCodes,
        skills,
        identifierFlags: flagsToSave,
        status: 'draft',
      }).then(() => setSavedAt(new Date().toLocaleTimeString()))
    }, 700)
    return () => clearTimeout(h)
  }, [ready, user, placementId, step, whatHappened, soWhat, nowWhat, reflectedOn, selected, skills, reflectionItemCodes, flagsToSave])

  const totals = useLiveQuery(
    async () => {
      if (!placementId) return { reflections: 0, skills: 0, standards: 0 }
      const all = (
        await db.reflections.where('placementId').equals(placementId).toArray()
      ).filter((r) => !r.deletedAt)
      const stds = new Set<number>()
      let sk = 0
      for (const r of all) {
        r.standardIds.forEach((s) => stds.add(s))
        sk += r.skills?.length ?? 0
      }
      return { reflections: all.length, skills: sk, standards: stds.size }
    },
    [placementId, step],
    { reflections: 0, skills: 0, standards: 0 }
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return library
      .filter((s) => s.name.toLowerCase().includes(q) && !skills.some((x) => x.skillId === s.id))
      .slice(0, 5)
  }, [query, library, skills])

  function addSkill(entry: SkillLibraryEntry) {
    const status = priorSkillIds.has(entry.id) ? 'renewed' : 'new'
    setSkills((prev) => [
      ...prev,
      {
        id: newId(),
        skillId: entry.id,
        name: entry.name,
        status,
        standardIds: entry.standardIds,
        itemCodes: entry.itemCodes,
      },
    ])
    setQuery('')
  }

  function addFreeText() {
    const t = query.trim()
    if (!t) return
    // Free text is allowed but quarantined: name shown, but it carries no library
    // mapping and is queued for normalisation server-side (spec §3).
    setSkills((prev) => [
      ...prev,
      { id: newId(), rawText: t, name: t, status: 'new', standardIds: [], itemCodes: [] },
    ])
    setQuery('')
  }

  function toggleStatus(id: string) {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === 'new' ? 'renewed' : 'new' } : s))
    )
  }

  function removeSkill(id: string) {
    setSkills((prev) => prev.filter((s) => s.id !== id))
  }

  function toggleStandard(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function goReview() {
    // Merge any newly-inferred standards (e.g. after adding a skill), unless the
    // student turned tag suggestions off. Never re-adds ones they removed.
    if (taggingOn) {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const id of suggested) {
          if (!appliedSuggestions.current.has(id)) {
            next.add(id)
            appliedSuggestions.current.add(id)
          }
        }
        return next
      })
    }
    setStep('review')
  }

  async function finish() {
    if (!user) return
    // Guarantee a placement before we ever show "Saved" — never affirm a save
    // that didn't happen.
    const pid = placementId ?? (await getOrCreateActivePlacement(user.id)).id
    if (!placementId) setPlacementId(pid)
    await saveReflection({
      id: idRef.current,
      placementId: pid,
      userId: user.id,
      whatHappened,
      soWhat,
      nowWhat,
      reflectedOn,
      standardIds: [...selected],
      itemCodes: reflectionItemCodes,
      skills,
      identifierFlags: flagsToSave,
      status: 'saved',
    })
    setStep('saved')
  }

  const stepList: Step[] = mode === 'skill' ? ['skills', 'review'] : ['reflect', 'skills', 'review']
  const stepIndex = stepList.indexOf(step)

  if (loading || !user || !ready) {
    return (
      <AppShell userId={user?.id ?? null}>
        <p className="text-sm text-ink-faint">Loading…</p>
      </AppShell>
    )
  }

  return (
    <AppShell userId={user.id}>
      <div className="mx-auto max-w-lg space-y-5">
        {step !== 'saved' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {stepList.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 w-6 rounded-full ${
                    i < stepIndex ? 'bg-teal-deep' : i === stepIndex ? 'bg-teal' : 'bg-line'
                  }`}
                  aria-hidden
                />
              ))}
              <span className="ml-2 font-mono text-xs text-ink-faint">
                {stepIndex + 1} of {stepList.length}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-teal-deep">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
              {savedAt ? `Saved ${savedAt}` : 'Draft autosaves'}
            </span>
          </div>
        )}

        {/* ---------------- REFLECT ---------------- */}
        {step === 'reflect' && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Tonight&rsquo;s reflection<span className="text-teal">.</span>
            </h1>
            <Prompt
              label="What happened?"
              placeholder="One moment from today — what did you do or see?"
              value={whatHappened}
              onChange={setWhatHappened}
              autoFocus
            />
            <Prompt
              label="So what?"
              optional="why it mattered"
              placeholder="Why did it matter? How did you feel, what did you learn?"
              value={soWhat}
              onChange={setSoWhat}
            />
            <Prompt
              label="Now what?"
              optional="optional"
              placeholder="What will you do differently next shift?"
              value={nowWhat}
              onChange={setNowWhat}
            />

            {openFlags.length > 0 && (
              <div className="flex items-start gap-2 rounded-card border border-flag-line bg-flag-bg p-3 text-xs leading-relaxed text-flag-ink">
                <span className="font-semibold text-flag" aria-hidden>
                  ⚑
                </span>
                <span>
                  Some details might identify someone (e.g.{' '}
                  <b>{openFlags.slice(0, 3).map((f) => f.label).join(', ')}</b>). Consider
                  &ldquo;the patient&rdquo; or an initial — we&rsquo;ll ask again before you export.
                </span>
              </div>
            )}

            <Field label="Date of shift" htmlFor="reflectedOn">
              <Input
                id="reflectedOn"
                type="date"
                value={reflectedOn}
                max={todayISO()}
                onChange={(e) => setReflectedOn(e.target.value)}
                className="max-w-[12rem]"
              />
            </Field>

            <Button onClick={() => setStep('skills')} disabled={whatHappened.trim().length < 3}>
              Next: add skills →
            </Button>
          </div>
        )}

        {/* ---------------- SKILLS ---------------- */}
        {step === 'skills' && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              What did you do<span className="text-teal">?</span>
            </h1>
            <div className="space-y-2">
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skills — e.g. wound care"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (results[0]) addSkill(results[0])
                    else addFreeText()
                  }
                }}
              />
              {query.trim() && (
                <Card className="space-y-1 p-1.5">
                  {results.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSkill(s)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sage-50"
                    >
                      <span className="text-teal-deep" aria-hidden>
                        ＋
                      </span>
                      <span className="flex-1">{s.name}</span>
                      {s.standardIds[0] && (
                        <span className="font-mono text-[10px] text-ink-faint">
                          Std {s.standardIds.join(', ')}
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={addFreeText}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sage-50"
                  >
                    <span className="text-ink-faint" aria-hidden>
                      ✎
                    </span>
                    <span className="flex-1">
                      Add &ldquo;{query.trim()}&rdquo; as free text
                      <span className="block font-mono text-[10px] text-ink-faint">
                        we&rsquo;ll match it to the library later
                      </span>
                    </span>
                  </button>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              {skills.map((s) => (
                <Card key={s.id} className="flex items-center gap-3 p-3">
                  <span className="flex-1 text-sm font-medium leading-tight">
                    {s.name}
                    {s.standardIds[0] && (
                      <span className="mt-0.5 block font-mono text-[10px] font-normal text-ink-faint">
                        Std {s.standardIds.join(', ')}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => toggleStatus(s.id)}
                    className={`min-h-[36px] rounded-lg px-2.5 text-xs font-semibold ${
                      s.status === 'new'
                        ? 'bg-new text-teal-deep'
                        : 'bg-renew-bg text-renew'
                    }`}
                    title="Auto-set from your history — tap to change"
                  >
                    {s.status === 'new' ? 'New' : 'Renewed'} ▾
                  </button>
                  <button
                    onClick={() => removeSkill(s.id)}
                    className="min-h-[36px] px-1 text-lg text-ink-faint hover:text-ink"
                    aria-label="Remove skill"
                  >
                    ×
                  </button>
                </Card>
              ))}
              {skills.length === 0 && (
                <p className="text-sm text-ink-faint">
                  Search and tap to add the skills this shift surfaced. New vs Renewed is set
                  from your history.
                </p>
              )}
            </div>

            <Button onClick={goReview} disabled={skills.length === 0}>
              Next: confirm mapping →
            </Button>
            {mode === 'full' && (
              <Button variant="ghost" onClick={() => setStep('reflect')}>
                ← Back to reflection
              </Button>
            )}
          </div>
        )}

        {/* ---------------- REVIEW ---------------- */}
        {step === 'review' && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Review &amp; save<span className="text-teal">.</span>
            </h1>

            {whatHappened.trim() && (
              <Card>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  Reflection
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{whatHappened}</p>
              </Card>
            )}

            {skills.length > 0 && (
              <Card>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  Skills · {skills.length}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium"
                    >
                      {s.name}
                      <span
                        className={`rounded px-1 py-0.5 text-[9px] font-semibold ${
                          s.status === 'new' ? 'bg-new text-teal-deep' : 'bg-renew-bg text-renew'
                        }`}
                      >
                        {s.status === 'new' ? 'New' : 'Renew'}
                      </span>
                    </span>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                Maps to NMBA standards
                <span className="rounded bg-new px-1.5 py-0.5 text-[9px] text-teal-deep">
                  auto-suggested
                </span>
              </p>
              <div className="mt-3 space-y-2">
                {standards.map((s) => {
                  const on = selected.has(s.id)
                  const code = itemForStd.get(s.id)
                  const item = code ? itemByCode.get(code) : undefined
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleStandard(s.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        on ? 'border-teal bg-new' : 'border-line bg-surface hover:border-sage-300'
                      }`}
                      aria-pressed={on}
                    >
                      <span className="w-6 font-mono text-sm font-medium text-teal-deep">
                        {s.ordinal}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold leading-tight">{s.title}</span>
                        {item && (
                          <span className="mt-0.5 block text-xs text-ink-soft">
                            {item.code} {item.label}
                          </span>
                        )}
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-sm ${
                          on ? 'bg-teal text-teal-ink' : 'border border-line text-transparent'
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                    </button>
                  )
                })}
              </div>
            </Card>

            <Button onClick={finish}>
              Save reflection<span aria-hidden>.</span>
            </Button>
            <Button variant="ghost" onClick={() => setStep('skills')}>
              ← Back to skills
            </Button>
          </div>
        )}

        {/* ---------------- SAVED ---------------- */}
        {step === 'saved' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal text-2xl font-bold text-teal-ink">
              ✓
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
              Saved<span className="text-teal">.</span>
            </h2>
            <p className="mt-2 max-w-xs text-sm text-ink-soft">
              {skills.length > 0
                ? `Reflection + ${skills.length} skill${skills.length === 1 ? '' : 's'}`
                : 'Reflection'}
              {selected.size > 0
                ? `, mapped to ${selected.size} NMBA standard${selected.size === 1 ? '' : 's'}.`
                : '.'}
            </p>
            <div className="mt-6 flex gap-8">
              <Stat n={totals.reflections} label="reflections" />
              <Stat n={totals.skills} label="skills" />
              <Stat n={`${totals.standards}/7`} label="standards" />
            </div>
            <div className="mt-8 w-full space-y-2">
              <Button variant="quiet" onClick={() => router.replace('/reflections')}>
                View my reflections
              </Button>
              <Button variant="ghost" onClick={() => router.replace('/reflections')}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function Prompt({
  label,
  optional,
  placeholder,
  value,
  onChange,
  autoFocus,
}: {
  label: string
  optional?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-display text-base font-semibold">
          <span className="text-teal">.</span> {label}
        </span>
        {optional && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            {optional}
          </span>
        )}
      </div>
      <textarea
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-y rounded-card border border-line bg-surface p-3.5 text-sm leading-relaxed text-ink shadow-card outline-none transition placeholder:text-ink-faint focus:border-teal focus:ring-2 focus:ring-teal/30"
      />
    </div>
  )
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-semibold text-teal-deep">{n}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
    </div>
  )
}
