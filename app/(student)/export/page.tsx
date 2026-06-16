'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { db } from '@/src/db/schema'
import { getProfile } from '@/src/data/profile'
import { getActivePlacement, archivePlacement } from '@/src/data/placements'
import { getStandards, getUniversities } from '@/src/data/standards'
import { exportPlacement, type ExportData } from '@/src/export/exportPlacement'
import type { Placement } from '@/src/data/types'
import { AppShell } from '@/src/ui/AppShell'
import { Button, Card } from '@/src/ui/components'

export default function ExportPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [order, setOrder] = useState<'forward' | 'reverse'>('forward')
  const [count, setCount] = useState(0)
  const [ready, setReady] = useState(false)
  const [building, setBuilding] = useState(false)

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
      if (active) {
        const all = await db.reflections.where('placementId').equals(active.id).toArray()
        setCount(all.filter((r) => !r.deletedAt).length)
      }
      setReady(true)
    })()
  }, [user, router])

  async function buildData(): Promise<ExportData | null> {
    if (!user || !placement) return null
    const profile = await getProfile(user.id)
    const standards = await getStandards(profile?.nurseTrack ?? 'RN')
    const standardLabel = new Map(standards.map((s) => [s.id, `${s.ordinal}. ${s.title}`]))
    const universities = await getUniversities()
    const universityName = universities.find((u) => u.id === profile?.universityId)?.name

    const all = await db.reflections.where('placementId').equals(placement.id).toArray()
    const live = all
      .filter((r) => !r.deletedAt)
      .sort((a, b) => (a.reflectedOn < b.reflectedOn ? -1 : a.reflectedOn > b.reflectedOn ? 1 : 0))
    const ordered = order === 'forward' ? live : [...live].reverse()

    return {
      studentName: profile?.fullName ?? '',
      university: universityName,
      program: profile?.program,
      ward: placement.ward,
      hospital: placement.hospital,
      startDate: placement.startDate,
      endDate: placement.endDate,
      reflections: ordered.map((r) => ({
        reflectedOn: r.reflectedOn,
        body: r.body,
        standards: r.standardIds.map((id) => standardLabel.get(id) ?? `Standard ${id}`),
        tags: r.tags.map((t) => t.label),
      })),
    }
  }

  async function doExport(format: 'pdf' | 'text') {
    setBuilding(true)
    try {
      const data = await buildData()
      if (data) exportPlacement(format, data)
    } finally {
      setBuilding(false)
    }
  }

  async function finishPlacement() {
    if (!placement) return
    if (!confirm('Finish this placement? It will be archived but stays exportable.')) return
    await archivePlacement(placement.id)
    router.replace('/reflections')
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
        <h1 className="text-xl font-semibold tracking-tight">Export placement</h1>
        <Card className="space-y-1">
          <p className="font-medium">
            {[placement?.ward, placement?.hospital].filter(Boolean).join(' · ') || 'Current placement'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {count} reflection{count === 1 ? '' : 's'}
          </p>
        </Card>

        <div>
          <p className="mb-2 text-sm font-medium">Order</p>
          <div className="flex gap-2">
            <Button variant={order === 'forward' ? 'primary' : 'secondary'} onClick={() => setOrder('forward')}>
              Oldest first
            </Button>
            <Button variant={order === 'reverse' ? 'primary' : 'secondary'} onClick={() => setOrder('reverse')}>
              Newest first
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Button className="w-full" disabled={building || count === 0} onClick={() => doExport('pdf')}>
            {building ? 'Preparing…' : 'Export as PDF'}
          </Button>
          <Button variant="secondary" className="w-full" disabled={building || count === 0} onClick={() => doExport('text')}>
            Export as text
          </Button>
        </div>

        <hr className="border-slate-200 dark:border-slate-800" />
        <Button variant="ghost" className="w-full" onClick={finishPlacement}>
          Finish this placement
        </Button>
      </div>
    </AppShell>
  )
}
