'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { db } from '@/src/db/schema'
import { getProfile } from '@/src/data/profile'
import { getActivePlacement, archivePlacement } from '@/src/data/placements'
import { getStandards, getUniversities } from '@/src/data/standards'
import { getReflection, saveReflection } from '@/src/data/reflections'
import { scanIdentifiers } from '@/src/tagging/identifiers'
import { newId } from '@/src/data/ids'
import { exportPlacement, type ExportData } from '@/src/export/exportPlacement'
import type { Placement } from '@/src/data/types'
import { AppShell } from '@/src/ui/AppShell'
import { Button, Card } from '@/src/ui/components'

type Step = 'scope' | 'gate' | 'ready'
interface Issue {
  reflectionId: string
  reflectedOn: string
  label: string
  kind: string
}

function reflectionText(r: { whatHappened?: string; soWhat?: string; nowWhat?: string; body?: string }) {
  return [r.whatHappened, r.soWhat, r.nowWhat, r.body].filter(Boolean).join('\n')
}

// One selector for "what ships", used by both the identifier gate and the export
// builder so the gate scans exactly the text that ends up in the file.
function isExportable(r: {
  deletedAt?: string
  whatHappened?: string
  soWhat?: string
  nowWhat?: string
  body?: string
  skills?: unknown[]
}): boolean {
  return (
    !r.deletedAt &&
    Boolean(r.whatHappened || r.soWhat || r.nowWhat || r.body || (r.skills?.length ?? 0) > 0)
  )
}

// Compose the exported body from the three structured prompts (the record was
// dropping "So what?" and "Now what?" entirely); fall back to legacy `body`.
function exportBody(r: { whatHappened?: string; soWhat?: string; nowWhat?: string; body?: string }): string {
  if (r.whatHappened || r.soWhat || r.nowWhat) {
    return [
      r.whatHappened && `What happened?\n${r.whatHappened}`,
      r.soWhat && `So what?\n${r.soWhat}`,
      r.nowWhat && `Now what?\n${r.nowWhat}`,
    ]
      .filter(Boolean)
      .join('\n\n')
  }
  return r.body || ''
}

export default function ExportPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [order, setOrder] = useState<'forward' | 'reverse'>('forward')
  const [count, setCount] = useState(0)
  const [ready, setReady] = useState(false)

  const [step, setStep] = useState<Step>('scope')
  const [issues, setIssues] = useState<Issue[]>([])
  const [building, setBuilding] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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
        setCount(all.filter(isExportable).length)
      }
      setReady(true)
    })()
  }, [user, router])

  async function buildIssues(): Promise<Issue[]> {
    if (!placement) return []
    const all = (await db.reflections.where('placementId').equals(placement.id).toArray()).filter(
      isExportable
    )
    const out: Issue[] = []
    for (const r of all) {
      const dismissed = new Set(
        (r.identifierFlags ?? [])
          .filter((f) => f.status === 'dismissed')
          .map((f) => f.label.toLowerCase())
      )
      for (const f of scanIdentifiers(reflectionText(r))) {
        if (!dismissed.has(f.label.toLowerCase()))
          out.push({ reflectionId: r.id, reflectedOn: r.reflectedOn, label: f.label, kind: f.kind })
      }
    }
    return out
  }

  async function checkIdentifiers() {
    const found = await buildIssues()
    setIssues(found)
    setStep('gate')
  }

  async function dismissIssue(it: Issue) {
    const r = await getReflection(it.reflectionId)
    if (!r) return
    const flags = [...(r.identifierFlags ?? [])]
    const idx = flags.findIndex((f) => f.label.toLowerCase() === it.label.toLowerCase())
    if (idx >= 0) flags[idx] = { ...flags[idx], status: 'dismissed' }
    else flags.push({ id: newId(), label: it.label, kind: 'other', status: 'dismissed' })
    await saveReflection({ id: r.id, placementId: r.placementId, userId: r.userId, identifierFlags: flags, status: r.status })
    setIssues(await buildIssues())
  }

  async function buildData(): Promise<ExportData | null> {
    if (!user || !placement) return null
    const profile = await getProfile(user.id)
    const standards = await getStandards(profile?.nurseTrack ?? 'RN')
    const standardLabel = new Map(standards.map((s) => [s.id, `${s.ordinal}. ${s.title}`]))
    const universities = await getUniversities()
    const universityName = universities.find((u) => u.id === profile?.universityId)?.name

    const all = await db.reflections.where('placementId').equals(placement.id).toArray()
    const live = all
      .filter(isExportable)
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
        body: exportBody(r),
        standards: r.standardIds.map((id) => standardLabel.get(id) ?? `Standard ${id}`),
        tags: (r.skills ?? []).map((s) => s.name),
      })),
    }
  }

  async function doExport(format: 'pdf' | 'text') {
    setBuilding(true)
    setExportError(null)
    try {
      const data = await buildData()
      if (data) exportPlacement(format, data)
    } catch (err) {
      setExportError((err as Error).message)
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
        <p className="text-sm text-ink-faint">Loading…</p>
      </AppShell>
    )
  }

  return (
    <AppShell userId={user.id}>
      <div className="space-y-5">
        {/* ---------------- SCOPE ---------------- */}
        {step === 'scope' && (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Export your record<span className="text-teal">.</span>
            </h1>
            <Card className="space-y-1">
              <p className="font-medium">
                {[placement?.ward, placement?.hospital].filter(Boolean).join(' · ') ||
                  'Current placement'}
              </p>
              <p className="text-sm text-ink-soft">
                {count} reflection{count === 1 ? '' : 's'}
              </p>
            </Card>

            <div>
              <p className="mb-2 text-sm font-medium">Order</p>
              <div className="flex gap-2">
                <Button
                  variant={order === 'forward' ? 'primary' : 'quiet'}
                  onClick={() => setOrder('forward')}
                >
                  Oldest first
                </Button>
                <Button
                  variant={order === 'reverse' ? 'primary' : 'quiet'}
                  onClick={() => setOrder('reverse')}
                >
                  Newest first
                </Button>
              </div>
            </div>

            <div className="rounded-card border border-line border-l-[3px] border-l-ink-faint bg-surface p-3.5 text-xs leading-relaxed text-ink-soft">
              This exports as a document you keep — <b className="text-ink">your reflective record.</b>{' '}
              It&rsquo;s a record of your learning, not a competency assessment or proof of practice.
            </div>

            <Button disabled={count === 0} onClick={checkIdentifiers}>
              Check for identifiers →
            </Button>

            <hr className="border-line" />
            <Button variant="ghost" onClick={finishPlacement}>
              Finish this placement
            </Button>
          </>
        )}

        {/* ---------------- IDENTIFIER GATE ---------------- */}
        {step === 'gate' && (
          <>
            <div className="-mx-4 -mt-6 border-b border-flag-line bg-flag-bg px-4 pb-4 pt-5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-flag">
                ⚑ Before you share this
              </p>
              <h1 className="mt-1.5 font-display text-xl font-semibold leading-tight text-flag-ink">
                {issues.length > 0
                  ? `${issues.length} detail${issues.length === 1 ? '' : 's'} could identify someone.`
                  : 'Nothing common flagged — but this check is partial.'}
              </h1>
            </div>

            {issues.length > 0 ? (
              <div className="space-y-3">
                {issues.map((it, i) => (
                  <Card key={`${it.reflectionId}-${it.label}-${i}`}>
                    <p className="text-[11px] font-mono uppercase text-ink-faint">
                      {it.reflectedOn} · {it.kind}
                    </p>
                    <p className="mt-1 text-sm">
                      Looks like an identifier:{' '}
                      <span className="rounded bg-flag-bg px-1 font-semibold text-flag">
                        {it.label}
                      </span>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="quiet"
                        className="w-auto flex-1 px-3 text-sm"
                        onClick={() => router.push(`/reflections/${it.reflectionId}/edit`)}
                      >
                        Edit reflection
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-auto px-3 text-sm"
                        onClick={() => dismissIssue(it)}
                      >
                        Not an identifier
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-ink-soft">
                Nothing common left to flag. Read it through once more before you share — the check
                misses unstructured identifiers (rare presentations, indirect references).
              </p>
            )}

            <div className="flex items-start gap-2 rounded-card border border-line bg-surface p-3 text-xs leading-relaxed text-ink-soft">
              <span className="text-ink-faint" aria-hidden>
                ℹ
              </span>
              <span>
                <b className="text-ink">Prac. catches common identifiers</b> — names, ages, bed and
                room numbers, dates. It won&rsquo;t catch everything. What&rsquo;s left is yours to
                check before you share.
              </span>
            </div>

            <Button disabled={issues.length > 0} onClick={() => setStep('ready')}>
              {issues.length > 0
                ? `${issues.length} to review`
                : 'Generate my record →'}
            </Button>
            <Button variant="ghost" onClick={() => setStep('scope')}>
              Back
            </Button>
          </>
        )}

        {/* ---------------- RECORD READY ---------------- */}
        {step === 'ready' && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal text-2xl font-bold text-teal-ink">
              ✓
            </div>
            <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
              Record ready<span className="text-teal">.</span>
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              {count} reflection{count === 1 ? '' : 's'}.
            </p>

            <div className="mt-6 flex w-full items-start gap-2 rounded-card border border-flag-line bg-flag-bg p-3 text-left text-xs leading-relaxed text-flag-ink">
              <span className="font-semibold text-flag" aria-hidden>
                ⚑
              </span>
              <span>
                Checked for common identifiers. <b>Anything we missed is yours to catch</b> before
                you send this to anyone.
              </span>
            </div>

            {exportError && (
              <p className="mt-4 w-full rounded-card border border-flag-line bg-flag-bg p-3 text-left text-xs leading-relaxed text-flag-ink">
                {exportError}
              </p>
            )}

            <div className="mt-6 w-full space-y-2">
              <Button disabled={building} onClick={() => doExport('pdf')}>
                {building ? 'Preparing…' : 'Save as PDF'}
              </Button>
              <Button variant="quiet" disabled={building} onClick={() => doExport('text')}>
                Save as text
              </Button>
              <Button variant="ghost" onClick={() => setStep('scope')}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
