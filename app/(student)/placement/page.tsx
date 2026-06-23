'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { getProfile } from '@/src/data/profile'
import {
  getActivePlacement,
  updatePlacement,
  startNewPlacement,
} from '@/src/data/placements'
import type { Placement } from '@/src/data/types'
import { todayISO } from '@/src/data/ids'
import { AppShell } from '@/src/ui/AppShell'
import { Button, Card, Field, Input } from '@/src/ui/components'
import { PLACEMENT_CONTEXTS } from '@/src/content/contexts'

// Edit the current placement's details, or move on to a new placement (which
// archives the current one — its reflections stay saved as a separate record).
export default function PlacementPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [ready, setReady] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)

  const [context, setContext] = useState<string | null>(null)
  const [ward, setWard] = useState('')
  const [hospital, setHospital] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const [busy, setBusy] = useState(false)

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
      const p = (await getActivePlacement(user.id)) ?? null
      setPlacement(p)
      if (p) {
        setContext(p.context ?? null)
        setWard(p.ward ?? '')
        setHospital(p.hospital ?? '')
        setStartDate(p.startDate ?? '')
        setEndDate(p.endDate ?? '')
      }
      setReady(true)
    })()
  }, [user, router])

  function fields() {
    return {
      context: context ?? undefined,
      ward: ward.trim() || undefined,
      hospital: hospital.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }
  }

  async function save() {
    if (!user || busy) return
    setBusy(true)
    try {
      if (placement) {
        await updatePlacement(placement.id, fields())
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        // No active placement yet (e.g. came in via "just looking") — create one.
        await startNewPlacement(user.id, fields())
        router.replace('/reflections')
      }
    } finally {
      setBusy(false)
    }
  }

  async function beginNew() {
    if (!user || busy) return
    setBusy(true)
    try {
      await startNewPlacement(user.id, fields())
      router.replace('/reflections')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user || !ready) {
    return (
      <AppShell userId={user?.id ?? null}>
        <p className="text-sm text-ink-faint">Loading…</p>
      </AppShell>
    )
  }

  return (
    <AppShell userId={user.id}>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Your placement<span className="text-teal">.</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Update the details any time. When you move to a new placement, start a fresh one, and your
            past reflections stay saved under the old placement.
          </p>
        </div>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-medium">Placement type</p>
            <p className="mb-2 mt-0.5 text-xs text-ink-soft">
              Tailors which skills you see when you reflect.
            </p>
            <div className="flex flex-wrap gap-2">
              {PLACEMENT_CONTEXTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={context === c}
                  onClick={() => setContext(c)}
                  className={`min-h-[44px] rounded-2xl border px-3.5 text-sm font-medium transition ${
                    context === c
                      ? 'border-teal bg-teal text-teal-ink'
                      : 'border-sage-200 bg-surface text-ink hover:border-sage-300'
                  }`}
                >
                  {c}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={context === null}
                onClick={() => setContext(null)}
                className={`min-h-[44px] rounded-2xl border px-3.5 text-sm font-medium transition ${
                  context === null
                    ? 'border-teal bg-teal text-teal-ink'
                    : 'border-sage-200 bg-surface text-ink hover:border-sage-300'
                }`}
              >
                Not sure / general
              </button>
            </div>
          </div>
          <Field label="Ward / unit" htmlFor="ward">
            <Input
              id="ward"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="e.g. 6A, Emergency"
            />
          </Field>
          <Field label="Hospital" htmlFor="hospital">
            <Input
              id="hospital"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="e.g. Royal Melbourne"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" htmlFor="start">
              <Input
                id="start"
                type="date"
                value={startDate}
                max={endDate || todayISO()}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="End date" htmlFor="end">
              <Input
                id="end"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button className="w-auto px-6" onClick={save} disabled={busy}>
              {placement ? 'Save changes' : 'Save placement'}
            </Button>
            {saved && <span className="text-sm font-medium text-teal-deep">Saved</span>}
          </div>
        </Card>

        {placement && (
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Started a new placement?</h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              This archives your current placement and starts a fresh one with the details above.
              Your reflections from the old placement stay saved as a separate record you can still
              view in your history and export.
            </p>
            {!confirmNew ? (
              <Button variant="quiet" className="w-auto px-5" onClick={() => setConfirmNew(true)}>
                Start a new placement
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button className="w-auto px-5" onClick={beginNew} disabled={busy}>
                  Yes, keep old reflections
                </Button>
                <Button variant="ghost" className="w-auto px-4" onClick={() => setConfirmNew(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
