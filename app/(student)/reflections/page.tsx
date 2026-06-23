'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/src/db/schema'
import { useUser } from '@/src/auth/useUser'
import { getProfile } from '@/src/data/profile'
import { getActivePlacement } from '@/src/data/placements'
import { softDeleteReflection, restoreReflection } from '@/src/data/reflections'
import type { Placement } from '@/src/data/types'
import { AppShell } from '@/src/ui/AppShell'
import { ChevronRight } from 'lucide-react'
import { Button, Card } from '@/src/ui/components'
import { CONTEXT_TO_GUIDE } from '@/src/content/contexts'
import { todayISO } from '@/src/data/ids'

// ISO week key (year + week number) for the gentle weekly streak.
function weekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7
    )
  return `${target.getFullYear()}-W${week}`
}

function weekStreak(dates: string[]): number {
  const weeks = new Set(dates.map(weekKey))
  let streak = 0
  const cursor = new Date()
  for (;;) {
    if (!weeks.has(weekKey(cursor.toISOString().slice(0, 10)))) break
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function daysFromToday(iso: string): number {
  const ms = new Date(iso + 'T00:00:00').getTime() - new Date(todayISO() + 'T00:00:00').getTime()
  return Math.round(ms / 86400000)
}

// Date range + a "days left" / "starts in" / "ended" status for the placement card.
function placementInfo(p: { startDate?: string; endDate?: string }): { range: string; status: string } {
  const range = [fmtDate(p.startDate), fmtDate(p.endDate)].filter(Boolean).join(' – ')
  const today = todayISO()
  let status = ''
  if (p.startDate && today < p.startDate) {
    const n = daysFromToday(p.startDate)
    status = `Starts in ${n} day${n === 1 ? '' : 's'}`
  } else if (p.endDate) {
    if (today > p.endDate) status = 'Placement ended'
    else {
      const n = daysFromToday(p.endDate)
      status = n === 0 ? 'Last day' : `${n} day${n === 1 ? '' : 's'} left`
    }
  }
  return { range, status }
}

export default function ReflectionsPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [ready, setReady] = useState(false)
  const [undo, setUndo] = useState<{ id: string } | null>(null)

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
      setPlacement((await getActivePlacement(user.id)) ?? null)
      setReady(true)
    })()
  }, [user, router])

  const reflections = useLiveQuery(
    async () => {
      if (!placement) return []
      const all = await db.reflections.where('placementId').equals(placement.id).toArray()
      return all
        .filter((r) => !r.deletedAt && (r.body || (r.skills?.length ?? 0) > 0))
        .sort((a, b) =>
          a.reflectedOn < b.reflectedOn
            ? 1
            : a.reflectedOn > b.reflectedOn
              ? -1
              : b.createdAt.localeCompare(a.createdAt)
        )
    },
    [placement?.id],
    []
  )

  const coverage = useMemo(() => {
    const stds = new Set<number>()
    for (const r of reflections ?? []) r.standardIds.forEach((s) => stds.add(s))
    return stds.size
  }, [reflections])

  const noneThisWeek = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const iso = cutoff.toISOString().slice(0, 10)
    return (reflections ?? []).every((r) => r.reflectedOn < iso)
  }, [reflections])

  // Gentle weekly streak: consecutive ISO weeks (ending this week) with a
  // reflection. Rewards steady logging without daily pressure.
  const streak = useMemo(() => weekStreak((reflections ?? []).map((r) => r.reflectedOn)), [reflections])

  async function handleDelete(id: string) {
    await softDeleteReflection(id)
    setUndo({ id })
    setTimeout(() => setUndo((u) => (u?.id === id ? null : u)), 6000)
  }

  if (loading || !user || !ready) {
    return (
      <AppShell userId={user?.id ?? null}>
        <p className="text-sm text-ink-faint">Loading…</p>
      </AppShell>
    )
  }

  const count = reflections?.length ?? 0
  const placementName =
    placement?.ward || placement?.hospital
      ? [placement?.ward, placement?.hospital].filter(Boolean).join(' · ')
      : 'Your placement'
  const info = placement ? placementInfo(placement) : null

  return (
    <AppShell userId={user.id}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Today<span className="text-teal">.</span>
            </h1>
          </div>
          <span className="shrink-0 text-right font-mono text-xs text-ink-faint">
            {streak > 0 && (
              <span className="block font-semibold text-teal-deep">🔥 {streak}-week streak</span>
            )}
            <span className="block">
              {count} · {coverage}/7 std
            </span>
          </span>
        </div>

        <Link href="/placement" className="block">
          <Card className="flex items-center gap-3 transition hover:border-sage-300">
            <span className="text-lg" aria-hidden>
              📍
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{placementName}</span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {info && (info.range || info.status) ? (
                  <>
                    {info.range}
                    {info.range && info.status ? ' · ' : ''}
                    {info.status && (
                      <span className="font-semibold text-teal-deep">{info.status}</span>
                    )}
                  </>
                ) : (
                  'Add your ward, hospital & dates'
                )}
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium text-teal-deep">Edit</span>
          </Card>
        </Link>

        <div className="flex gap-2">
          <Link href="/reflections/new" className="flex-1">
            <Button>
              Start a reflection<span aria-hidden>.</span>
            </Button>
          </Link>
          <Link href="/reflections/new?mode=skill">
            <Button variant="quiet" className="w-auto whitespace-nowrap px-4">
              Just log a skill
            </Button>
          </Link>
        </div>

        {/* Temporary spotlight for the Hospital Directory (lives a level down under
            Resources). Surfaced on Home so it's discoverable; remove once it has a
            permanent home in nav. */}
        <Link href="/hospitals" className="block">
          <Card className="flex items-center gap-3 border-teal/40 transition hover:border-teal">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-new text-lg"
              aria-hidden
            >
              🏥
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <b className="text-sm font-semibold">Hospital tips</b>
                <span className="rounded-full bg-teal px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-ink">
                  New
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                Parking, access, food &amp; culture, from real students.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
          </Card>
        </Link>

        {placement?.context && CONTEXT_TO_GUIDE[placement.context] && (
          <Link href={`/guides/${CONTEXT_TO_GUIDE[placement.context]}`}>
            <Card className="flex items-center gap-3 border-sage-200 bg-sage-50">
              <span aria-hidden>🏥</span>
              <span className="flex-1 text-sm">
                <b className="font-semibold">{placement.context} prep guide</b>
                <span className="text-ink-soft"> · likely skills &amp; prompts</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
            </Card>
          </Link>
        )}

        {count > 0 && noneThisWeek && (
          <Card className="border-flag-line bg-flag-bg">
            <p className="text-sm text-flag-ink">
              No reflection saved this week yet. A short one now keeps your record moving.
            </p>
          </Card>
        )}

        {count === 0 ? (
          <Card className="space-y-1.5 py-8 text-center">
            <p className="font-display text-lg font-semibold">Nothing logged yet.</p>
            <p className="mx-auto max-w-xs text-sm text-ink-soft">
              Your placement story starts with one shift. Two minutes is enough.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between pt-1">
              <h2 className="font-display text-lg font-semibold">Recent reflections</h2>
              <Link href="/history" className="text-sm font-medium text-teal-deep hover:text-ink">
                See all
              </Link>
            </div>
            <ul className="space-y-3">
              {reflections?.map((r) => {
              const toReview = (r.identifierFlags ?? []).filter((f) => f.status === 'open').length
              return (
                <li key={r.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/reflections/${r.id}/edit`} className="min-w-0 flex-1">
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
                      </Link>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="min-h-[44px] shrink-0 px-1 text-sm text-ink-faint hover:text-flag"
                        aria-label="Delete reflection"
                      >
                        Delete
                      </button>
                    </div>
                  </Card>
                </li>
              )
            })}
            </ul>
          </div>
        )}
      </div>

      {undo && (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-paper shadow-float">
          <span>Reflection deleted</span>
          <button
            onClick={async () => {
              await restoreReflection(undo.id)
              setUndo(null)
            }}
            className="font-semibold text-teal underline"
          >
            Undo
          </button>
        </div>
      )}
    </AppShell>
  )
}
