'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { getProfile } from '@/src/data/profile'
import { getActivePlacement } from '@/src/data/placements'
import { getReflection, saveReflection } from '@/src/data/reflections'
import { getStandards } from '@/src/data/standards'
import { suggestTags, type Suggestions } from '@/src/tagging/suggest'
import { newId, todayISO } from '@/src/data/ids'
import type { AnsatStandard, ReflectionTag } from '@/src/data/types'
import { AppShell } from './AppShell'
import { Button, Card, Chip, Field, Input } from './components'

function tagKey(kind: string, label: string) {
  return `${kind}:${label}`
}

export function ReflectionEditor({ reflectionId }: { reflectionId?: string }) {
  const router = useRouter()
  const { user, loading } = useUser()

  const idRef = useRef<string>(reflectionId ?? newId())
  const [placementId, setPlacementId] = useState<string | null>(null)
  const [standards, setStandards] = useState<AnsatStandard[]>([])
  const [taggingOn, setTaggingOn] = useState(true)
  const [ready, setReady] = useState(false)

  const [body, setBody] = useState('')
  const [reflectedOn, setReflectedOn] = useState(todayISO())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // Load context + any existing reflection.
  useEffect(() => {
    if (!user) return
    void (async () => {
      const profile = await getProfile(user.id)
      if (!profile) {
        router.replace('/onboarding')
        return
      }
      setTaggingOn(profile.taggingOn)
      setStandards(await getStandards(profile.nurseTrack))
      const active = await getActivePlacement(user.id)
      setPlacementId(active?.id ?? null)

      if (reflectionId) {
        const existing = await getReflection(reflectionId)
        if (existing) {
          setBody(existing.body)
          setReflectedOn(existing.reflectedOn)
          setSelected(new Set(existing.standardIds))
          setConfirmed(new Set(existing.tags.map((t) => tagKey(t.kind, t.label))))
        }
      }
      setReady(true)
    })()
  }, [user, reflectionId, router])

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [loading, user, router])

  const confirmedTags = useMemo<ReflectionTag[]>(() => {
    return [...confirmed].map((key) => {
      const [kind, ...rest] = key.split(':')
      return { kind: kind as ReflectionTag['kind'], label: rest.join(':'), source: 'auto' as const }
    })
  }, [confirmed])

  // Continuous autosave to IndexedDB — a half-written reflection survives a tab
  // close or reload (CLAUDE.md §3). Debounced so we don't thrash.
  useEffect(() => {
    if (!ready || !user || !placementId) return
    const handle = setTimeout(() => {
      void saveReflection({
        id: idRef.current,
        placementId,
        userId: user.id,
        body,
        reflectedOn,
        standardIds: [...selected],
        tags: confirmedTags,
      }).then(() => setSavedAt(new Date().toLocaleTimeString()))
    }, 700)
    return () => clearTimeout(handle)
  }, [ready, user, placementId, body, reflectedOn, selected, confirmedTags])

  // On-device suggestions, recomputed locally as you type. No network (CLAUDE.md §2.6).
  const suggestions: Suggestions = useMemo(() => {
    if (!taggingOn || body.trim().length < 12) {
      return { sentiment: 'neutral', emotions: [], topics: [] }
    }
    return suggestTags(body)
  }, [body, taggingOn])

  function toggleStandard(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTag(kind: string, label: string) {
    const key = tagKey(kind, label)
    setConfirmed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function done() {
    if (user && placementId) {
      await saveReflection({
        id: idRef.current,
        placementId,
        userId: user.id,
        body,
        reflectedOn,
        standardIds: [...selected],
        tags: confirmedTags,
      })
    }
    router.replace('/reflections')
  }

  if (loading || !user) {
    return (
      <AppShell userId={user?.id ?? null}>
        <p className="text-sm text-slate-500">Loading…</p>
      </AppShell>
    )
  }

  return (
    <AppShell userId={user.id}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">
            {reflectionId ? 'Edit reflection' : 'New reflection'}
          </h1>
          <Button onClick={done}>Done</Button>
        </div>

        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened on shift? What did you notice, feel, or learn?"
          className="min-h-[40vh] w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-base leading-relaxed text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
        />

        <p className="text-xs text-amber-700 dark:text-amber-400">
          Reminder: do not include patient-identifiable information (names, dates of birth,
          record numbers).
        </p>

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
          <p className="mb-2 text-sm font-medium">Standards demonstrated</p>
          <div className="flex flex-wrap gap-2">
            {standards.map((s) => (
              <Chip key={s.id} active={selected.has(s.id)} onClick={() => toggleStandard(s.id)} title={s.prompt}>
                {s.ordinal}. {s.title}
              </Chip>
            ))}
          </div>
        </div>

        {taggingOn && (suggestions.emotions.length > 0 || suggestions.topics.length > 0) && (
          <Card className="space-y-3">
            <p className="text-sm font-medium">Suggested tags</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Computed on your device. Tap to confirm — only confirmed tags are saved.
            </p>
            {suggestions.emotions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.emotions.map((label) => (
                  <Chip key={label} active={confirmed.has(tagKey('emotion', label))} onClick={() => toggleTag('emotion', label)}>
                    {label}
                  </Chip>
                ))}
              </div>
            )}
            {suggestions.topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.topics.map((label) => (
                  <Chip key={label} active={confirmed.has(tagKey('topic', label))} onClick={() => toggleTag('topic', label)}>
                    #{label}
                  </Chip>
                ))}
              </div>
            )}
          </Card>
        )}

        <p className="text-xs text-slate-400">{savedAt ? `Autosaved at ${savedAt}` : 'Autosaving…'}</p>
      </div>
    </AppShell>
  )
}
