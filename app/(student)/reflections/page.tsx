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
import { getStandards } from '@/src/data/standards'
import type { Placement, AnsatStandard } from '@/src/data/types'
import { AppShell } from '@/src/ui/AppShell'
import { Button, Card } from '@/src/ui/components'

export default function ReflectionsPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [ready, setReady] = useState(false)
  const [standards, setStandards] = useState<AnsatStandard[]>([])
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
      const active = await getActivePlacement(user.id)
      setPlacement(active ?? null)
      setStandards(await getStandards(profile.nurseTrack))
      setReady(true)
    })()
  }, [user, router])

  const standardTitle = useMemo(() => {
    const map = new Map(standards.map((s) => [s.id, `${s.ordinal}. ${s.title}`]))
    return (id: number) => map.get(id) ?? `Standard ${id}`
  }, [standards])

  const reflections = useLiveQuery(
    async () => {
      if (!placement) return []
      const all = await db.reflections.where('placementId').equals(placement.id).toArray()
      return all
        .filter((r) => !r.deletedAt)
        .sort((a, b) =>
          a.reflectedOn < b.reflectedOn ? 1 : a.reflectedOn > b.reflectedOn ? -1 : b.createdAt.localeCompare(a.createdAt)
        )
    },
    [placement?.id],
    []
  )

  const noneThisWeek = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const iso = cutoff.toISOString().slice(0, 10)
    return (reflections ?? []).every((r) => r.reflectedOn < iso)
  }, [reflections])

  async function handleDelete(id: string) {
    await softDeleteReflection(id)
    setUndo({ id })
    setTimeout(() => setUndo((u) => (u?.id === id ? null : u)), 6000)
  }

  if (loading || !user || !ready) {
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
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {placement?.ward || placement?.hospital
                ? [placement.ward, placement.hospital].filter(Boolean).join(' · ')
                : 'Current placement'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {reflections?.length ?? 0} reflection{(reflections?.length ?? 0) === 1 ? '' : 's'}
            </p>
          </div>
          <Link href="/reflections/new">
            <Button>New</Button>
          </Link>
        </div>

        {noneThisWeek && (reflections?.length ?? 0) >= 0 && (
          <Card className="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950">
            <p className="text-sm text-sky-800 dark:text-sky-200">
              No reflection saved this week yet. A short one now keeps you on track.
            </p>
          </Card>
        )}

        {reflections && reflections.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-600 dark:text-slate-300">No reflections yet.</p>
            <Link href="/reflections/new" className="mt-3 inline-block">
              <Button>Write your first</Button>
            </Link>
          </Card>
        ) : (
          <ul className="space-y-3">
            {reflections?.map((r) => (
              <li key={r.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{r.reflectedOn}</p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                        {r.body || <span className="italic text-slate-400">Empty</span>}
                      </p>
                      {r.standardIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.standardIds.map((id) => (
                            <span
                              key={id}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {standardTitle(id)}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.tags.map((t) => (
                            <span key={t.label} className="text-xs text-sky-600 dark:text-sky-400">
                              #{t.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Link href={`/reflections/${r.id}/edit`}>
                        <Button variant="ghost" className="min-h-[36px] px-3 text-sm">
                          Edit
                        </Button>
                      </Link>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="min-h-[36px] px-3 text-sm text-red-600 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {undo && (
        <div className="fixed inset-x-0 bottom-4 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          <span>Reflection deleted</span>
          <button
            onClick={async () => {
              await restoreReflection(undo.id)
              setUndo(null)
            }}
            className="font-semibold underline"
          >
            Undo
          </button>
        </div>
      )}
    </AppShell>
  )
}
