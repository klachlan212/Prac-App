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
import { TOPICS, type ReflectionTopic } from '@/src/content/topics'
import { NMBA_PLAIN, skillInContext } from '@/src/content/contexts'
import type { AnsatStandard, AnsatItem, SkillLibraryEntry, LoggedSkill } from '@/src/data/types'
import { Plus, Check, X, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react'
import { AppShell } from './AppShell'
import { Button, Card, Field, Input } from './components'

type Step = 'topic' | 'reflect' | 'skills' | 'review' | 'saved'

const CUSTOM_MAX = 60

// The core loop (spec §3): Topic → Reflection → Skills → NMBA mapping → Saved.
// A topic cue swaps the "What happened?" prompt and scopes the skills; skills are
// filtered to the placement's context; "Now what?" is required; mapping is
// inferred and confirmed at the end. `mode='skill'` is the standalone
// "just log a skill" path — it skips the topic + reflection prompts.
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
  const appliedSuggestions = useRef<Set<number>>(new Set())
  const [placementId, setPlacementId] = useState<string | null>(null)
  const [placementContext, setPlacementContext] = useState<string | null>(null)
  const [standards, setStandards] = useState<AnsatStandard[]>([])
  const [items, setItems] = useState<AnsatItem[]>([])
  const [library, setLibrary] = useState<SkillLibraryEntry[]>([])
  const [priorSkillIds, setPriorSkillIds] = useState<Set<string>>(new Set())
  const [dismissedLabels, setDismissedLabels] = useState<Set<string>>(new Set())
  const [taggingOn, setTaggingOn] = useState(true)
  const [ready, setReady] = useState(false)

  const initialStep: Step = mode === 'skill' ? 'skills' : reflectionId ? 'reflect' : 'topic'
  const [step, setStep] = useState<Step>(initialStep)
  const [topic, setTopic] = useState<ReflectionTopic | null>(null)
  const [whatHappened, setWhatHappened] = useState('')
  const [soWhat, setSoWhat] = useState('')
  const [nowWhat, setNowWhat] = useState('')
  const [reflectedOn, setReflectedOn] = useState(todayISO())
  const [skills, setSkills] = useState<LoggedSkill[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [customText, setCustomText] = useState('')
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
      setPlacementContext(active.context ?? null)

      // New/Renewed auto-set from SAVED history only (drafts would mislabel).
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
  const flagsToSave = useMemo(
    () =>
      flags.map((f) =>
        dismissedLabels.has(f.label.toLowerCase()) ? { ...f, status: 'dismissed' as const } : f
      ),
    [flags, dismissedLabels]
  )
  const openFlags = useMemo(() => flagsToSave.filter((f) => f.status === 'open'), [flagsToSave])
  const suggested = useMemo(() => inferStandards(skills, text), [skills, text])
  const reflectionItemCodes = useMemo(() => [...new Set(skills.flatMap((s) => s.itemCodes))], [skills])

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
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) &&
          skillInContext(s.contexts, placementContext) &&
          !skills.some((x) => x.skillId === s.id)
      )
      .slice(0, 8)
  }, [query, library, placementContext, skills])

  // Topic-scoped suggestions (full reflection only), filtered to the placement context.
  const suggestedSkills = useMemo(() => {
    if (!topic) return []
    return library
      .filter(
        (s) =>
          skillInContext(s.contexts, placementContext) &&
          (topic.skillStandards.length === 0 ||
            s.standardIds.some((x) => topic.skillStandards.includes(x))) &&
          !skills.some((x) => x.skillId === s.id)
      )
      .slice(0, 12)
  }, [topic, library, placementContext, skills])

  function selectTopic(t: ReflectionTopic) {
    setTopic(t)
    if (taggingOn) {
      setSelected(new Set(t.standards))
      appliedSuggestions.current = new Set(t.standards)
    }
    setStep('reflect')
  }

  function addSkill(entry: SkillLibraryEntry) {
    const status = priorSkillIds.has(entry.id) ? 'renewed' : 'new'
    setSkills((prev) => [
      ...prev,
      { id: newId(), skillId: entry.id, name: entry.name, status, standardIds: entry.standardIds, itemCodes: entry.itemCodes },
    ])
    setQuery('')
  }

  function addCustom(name: string, standardId: number) {
    const t = name.trim().slice(0, CUSTOM_MAX)
    if (!t) return
    // Custom task (spec): student-authored, mapped to a chosen standard, flagged
    // custom so it can be reviewed and promoted to the master list later.
    setSkills((prev) => [
      ...prev,
      { id: newId(), rawText: t, name: t, status: 'new', standardIds: [standardId], itemCodes: [], custom: true },
    ])
    setCustomText('')
    setCustomOpen(false)
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

  const stepList: Step[] =
    mode === 'skill'
      ? ['skills', 'review']
      : reflectionId
        ? ['reflect', 'skills', 'review']
        : ['topic', 'reflect', 'skills', 'review']
  const stepIndex = stepList.indexOf(step)
  const reflectReady = whatHappened.trim().length >= 3 && nowWhat.trim().length >= 3

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

        {/* ---------------- TOPIC ---------------- */}
        {step === 'topic' && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                What kind of moment<span className="text-teal">?</span>
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                Pick the closest, it just sets the right cue. No wrong answer.
              </p>
            </div>
            <div className="space-y-2.5">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTopic(t)}
                  className="flex w-full items-center gap-3.5 rounded-card border border-sage-200 bg-surface p-3.5 text-left shadow-card transition hover:-translate-y-px hover:border-sage-300"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-lg" aria-hidden>
                    {t.emoji}
                  </span>
                  <span className="flex-1 text-[15px] font-medium leading-snug">{t.label}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- REFLECT ---------------- */}
        {step === 'reflect' && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Your reflection<span className="text-teal">.</span>
            </h1>
            <Prompt
              label="What happened?"
              placeholder={topic?.placeholder ?? 'One moment from today: what did you do or see?'}
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
              required
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
                  &ldquo;the patient&rdquo; or an initial, and we&rsquo;ll ask again before you export.
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

            <div>
              <Button onClick={() => setStep('skills')} disabled={!reflectReady}>
                Next: add skills
              </Button>
              {!reflectReady && (
                <p className="mt-2 text-center text-xs text-ink-faint">
                  &ldquo;What happened?&rdquo; and &ldquo;Now what?&rdquo; are needed to continue.
                </p>
              )}
            </div>
            {mode === 'full' && !reflectionId && (
              <Button variant="ghost" onClick={() => setStep('topic')}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </Button>
            )}
          </div>
        )}

        {/* ---------------- SKILLS ---------------- */}
        {step === 'skills' && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                What did you do<span className="text-teal">?</span>
              </h1>
              {placementContext && (
                <p className="mt-1 text-sm text-ink-soft">
                  Showing skills common on {placementContext}.
                </p>
              )}
            </div>

            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills (e.g. wound care)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) addSkill(results[0])
              }}
            />

            {/* Search results */}
            {query.trim() && (
              <Card className="space-y-1 p-1.5">
                {results.map((s) => (
                  <SkillRow key={s.id} name={s.name} standards={s.standardIds} onClick={() => addSkill(s)} />
                ))}
                {results.length === 0 && (
                  <p className="px-3 py-2 text-sm text-ink-faint">No match in this placement&rsquo;s list.</p>
                )}
                <button
                  onClick={() => {
                    setCustomText(query.trim())
                    setCustomOpen(true)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sage-50"
                >
                  <span className="text-ink-faint" aria-hidden>
                    ✎
                  </span>
                  <span className="flex-1">
                    Can&rsquo;t find it? Add &ldquo;{query.trim()}&rdquo; as your own
                  </span>
                </button>
              </Card>
            )}

            {/* Topic-scoped suggestions when not searching */}
            {!query.trim() && suggestedSkills.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Suggested</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSkills.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSkill(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium hover:border-sage-300"
                    >
                      <Plus className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add-your-own entry + custom panel */}
            {!query.trim() && !customOpen && (
              <button
                onClick={() => {
                  setCustomText('')
                  setCustomOpen(true)
                }}
                className="text-sm font-medium text-teal-deep hover:text-ink"
              >
                Can&rsquo;t find it? Add your own
              </button>
            )}
            {customOpen && (
              <CustomPanel
                value={customText}
                onChange={setCustomText}
                onCancel={() => {
                  setCustomOpen(false)
                  setCustomText('')
                }}
                onPick={(stdId) => addCustom(customText, stdId)}
              />
            )}

            {/* Added skills */}
            <div className="space-y-2">
              {skills.map((s) => (
                <Card key={s.id} className="flex items-center gap-3 p-3">
                  <span className="flex-1 text-sm font-medium leading-tight">
                    {s.name}
                    <span className="mt-0.5 block font-mono text-[10px] font-normal text-ink-faint">
                      {s.custom ? 'Your own · ' : ''}
                      {s.standardIds[0] ? `Std ${s.standardIds.join(', ')}` : 'unmapped'}
                    </span>
                  </span>
                  <button
                    onClick={() => toggleStatus(s.id)}
                    className={`min-h-[36px] rounded-lg px-2.5 text-xs font-semibold ${
                      s.status === 'new' ? 'bg-new text-teal-deep' : 'bg-renew-bg text-renew'
                    }`}
                    title="Auto-set from your history, tap to change"
                  >
                    {s.status === 'new' ? 'New' : 'Renewed'}
                    <ChevronDown className="ml-0.5 inline h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    onClick={() => removeSkill(s.id)}
                    className="flex min-h-[36px] items-center px-1 text-ink-faint hover:text-ink"
                    aria-label="Remove skill"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </Card>
              ))}
              {skills.length === 0 && (
                <p className="text-sm text-ink-faint">
                  Search or tap a suggestion to add the skills this shift surfaced. New vs Renewed is
                  set from your history.
                </p>
              )}
            </div>

            <Button onClick={goReview} disabled={skills.length === 0}>
              Next: confirm mapping
            </Button>
            {mode === 'full' && (
              <Button variant="ghost" onClick={() => setStep('reflect')}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to reflection
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
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Reflection</p>
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
                <span className="rounded bg-new px-1.5 py-0.5 text-[9px] text-teal-deep">auto-suggested</span>
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
                      <span className="w-6 font-mono text-sm font-medium text-teal-deep">{s.ordinal}</span>
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
                        <Check className="h-4 w-4" aria-hidden />
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
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to skills
            </Button>
          </div>
        )}

        {/* ---------------- SAVED ---------------- */}
        {step === 'saved' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal text-teal-ink">
              <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden />
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

function SkillRow({ name, standards, onClick }: { name: string; standards: number[]; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sage-50"
    >
      <Plus className="h-3.5 w-3.5 shrink-0 text-teal-deep" aria-hidden />
      <span className="flex-1">{name}</span>
      {standards[0] && <span className="font-mono text-[10px] text-ink-faint">Std {standards.join(', ')}</span>}
    </button>
  )
}

function CustomPanel({
  value,
  onChange,
  onCancel,
  onPick,
}: {
  value: string
  onChange: (v: string) => void
  onCancel: () => void
  onPick: (standardId: number) => void
}) {
  const ready = value.trim().length > 0
  return (
    <Card className="space-y-3 border-teal/40">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Add your own task</span>
          <span className="font-mono text-[10px] text-ink-faint">
            {value.length}/{CUSTOM_MAX}
          </span>
        </div>
        <Input
          autoFocus
          value={value}
          maxLength={CUSTOM_MAX}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Bladder scan"
        />
      </div>
      <div>
        <p className="mb-2 text-xs text-ink-soft">Which standard does it fit?</p>
        <div className="flex flex-wrap gap-1.5">
          {NMBA_PLAIN.map((s) => (
            <button
              key={s.id}
              disabled={!ready}
              onClick={() => onPick(s.id)}
              className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-medium transition ${
                ready
                  ? 'border-line bg-surface hover:border-teal hover:bg-new'
                  : 'border-line bg-surface text-ink-faint opacity-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onCancel} className="text-xs font-medium text-ink-faint hover:text-ink">
        Cancel
      </button>
    </Card>
  )
}

function Prompt({
  label,
  optional,
  required,
  placeholder,
  value,
  onChange,
  autoFocus,
}: {
  label: string
  optional?: string
  required?: boolean
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
        {required && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-teal-deep">
            needed
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
