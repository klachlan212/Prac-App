'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/src/db/schema'
import { useUser } from '@/src/auth/useUser'
import { getProfile } from '@/src/data/profile'
import { getStandards } from '@/src/data/standards'
import type { AnsatStandard } from '@/src/data/types'
import { AppShell } from '@/src/ui/AppShell'
import { Card } from '@/src/ui/components'

// The filterable history (spec §4 — the payoff surface). Filters: NMBA standard
// (primary), skill type (New/Renewed), recency. Spans every placement so it's the
// student's whole growing record, not just the active block.
type SkillType = 'all' | 'new' | 'renewed'
type Recency = 'all' | '7' | '30'

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [ready, setReady] = useState(false)
  const [standards, setStandards] = useState<AnsatStandard[]>([])
  const [placementNames, setPlacementNames] = useState<Map<string, string>>(new Map())

  const [stdFilter, setStdFilter] = useState<Set<number>>(new Set())
  const [skillType, setSkillType] = useState<SkillType>('all')
  const [recency, setRecency] = useState<Recency>('all')

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
      setStandards(await getStandards(profile.nurseTrack))
      const ps = await db.placements.where('userId').equals(user.id).toArray()
      const m = new Map<string, string>()
      for (const p of ps) m.set(p.id, [p.ward, p.hospital].filter(Boolean).join(' · '))
      setPlacementNames(m)
      setReady(true)
    })()
  }, [user, router])

  const all = useLiveQuery(
    async () => {
      if (!user) return []
      const rows = await db.reflections.where('userId').equals(user.id).toArray()
      return rows
        .filter((r) => !r.deletedAt && (r.body || (r.skills?.length ?? 0) > 0))
        .sort((a, b) =>
          a.reflectedOn < b.reflectedOn
            ? 1
            : a.reflectedOn > b.reflectedOn
              ? -1
              : b.createdAt.localeCompare(a.createdAt)
        )
    },
    [user?.id],
    []
  )

  const filtered = useMemo(() => {
    const cutoff =
      recency === 'all'
        ? null
        : (() => {
            const d = new Date()
            d.setDate(d.getDate() - Number(recency))
            return d.toISOString().slice(0, 10)
          })()
    return (all ?? []).filter((r) => {
      if (stdFilter.size > 0 && !r.standardIds.some((s) => stdFilter.has(s))) return false
      if (skillType !== 'all' && !(r.skills ?? []).some((s) => s.status === skillType)) return false
      if (cutoff && r.reflectedOn < cutoff) return false
      return true
    })
  }, [all, stdFilter, skillType, recency])

  function toggleStd(id: number) {
    setStdFilter((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function clearAll() {
    setStdFilter(new Set())
    setSkillType('all')
    setRecency('all')
  }

  if (loading || !user || !ready) {
    return (
      <AppShell userId={user?.id ?? null}>
        <p className="text-sm text-ink-faint">Loading…</p>
      </AppShell>
    )
  }

  const total = all?.length ?? 0
  const hasFilters = stdFilter.size > 0 || skillType !== 'all' || recency !== 'all'

  return (
    <AppShell userId={user.id}>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Your record<span className="text-teal">.</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every reflection you&rsquo;ve saved, filter to find one.
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-soft">NMBA standard</p>
            <div className="flex flex-wrap gap-1.5">
              {standards.map((s) => {
                const on = stdFilter.has(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStd(s.id)}
                    aria-pressed={on}
                    title={s.title}
                    className={`flex h-11 min-w-[44px] items-center justify-center rounded-lg px-3 font-mono text-sm font-semibold transition ${
                      on
                        ? 'bg-teal text-teal-ink'
                        : 'border border-line bg-surface text-ink-soft hover:border-sage-300'
                    }`}
                  >
                    {s.ordinal}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Segment
              label="Skill type"
              value={skillType}
              onChange={setSkillType}
              options={[
                ['all', 'All'],
                ['new', 'New'],
                ['renewed', 'Renewed'],
              ]}
            />
            <Segment
              label="Recency"
              value={recency}
              onChange={setRecency}
              options={[
                ['all', 'All time'],
                ['7', '7 days'],
                ['30', '30 days'],
              ]}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-faint">
            {filtered.length} of {total} reflection{total === 1 ? '' : 's'}
          </p>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="min-h-[44px] text-sm font-medium text-teal-deep hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card className="py-8 text-center">
            <p className="text-sm text-ink-soft">
              {total === 0
                ? 'Nothing logged yet. Your record starts with one reflection.'
                : 'No reflections match these filters.'}
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => {
              const toReview = (r.identifierFlags ?? []).filter((f) => f.status === 'open').length
              const place = placementNames.get(r.placementId)
              return (
                <li key={r.id}>
                  <Link href={`/reflections/${r.id}/edit`} className="block">
                    <Card>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] uppercase text-ink-faint">
                          {r.reflectedOn}
                        </span>
                        {r.standardIds.length > 0 && (
                          <span className="ml-auto flex gap-1">
                            {r.standardIds.map((id) => (
                              <span
                                key={id}
                                className="rounded bg-new px-1.5 py-0.5 font-mono text-[10px] text-teal-deep"
                              >
                                {id}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-ink">
                        {r.body || <span className="italic text-ink-faint">Skill log</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                        {place && <span>{place}</span>}
                        {(r.skills?.length ?? 0) > 0 && (
                          <span>
                            {r.skills.length} skill{r.skills.length === 1 ? '' : 's'}
                          </span>
                        )}
                        {toReview > 0 && (
                          <span className="inline-flex items-center gap-1 font-semibold text-flag">
                            <span className="h-1.5 w-1.5 rounded-full bg-flag" aria-hidden />
                            {toReview} to review
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AppShell>
  )
}

function Segment<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-soft">{label}</p>
      <div className="inline-flex rounded-xl border border-line bg-surface p-1">
        {options.map(([val, txt]) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            aria-pressed={value === val}
            className={`min-h-[44px] rounded-lg px-3 text-sm font-medium transition ${
              value === val ? 'bg-new text-teal-deep' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {txt}
          </button>
        ))}
      </div>
    </div>
  )
}
