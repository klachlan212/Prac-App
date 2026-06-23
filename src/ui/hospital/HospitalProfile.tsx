'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check, ChevronDown } from 'lucide-react'
import {
  CATEGORIES,
  categoryMeta,
  isAgingStreetCheat,
  isStale,
  relativeTime,
  relevancePct,
  scoreTip,
  type Hospital,
  type ReferenceCard,
  type Tip,
  type TipCategory,
} from '@/src/content/hospitals'
import {
  castVote,
  fetchHospitalBySlug,
  fetchHospitals,
  fetchRefCards,
  fetchTips,
  getCachedHospitalBySlug,
  getCachedTips,
} from '@/src/data/hospitals'
import { SubmissionForm } from './SubmissionForm'
import { BottomNav } from '@/src/ui/BottomNav'

type SortMode = 'helpful' | 'latest'
type VoteDir = 'up' | 'down' | null
type VoteMap = Record<string, VoteDir>

const DEFAULT_OPEN: Record<TipCategory, boolean> = {
  Transit: true,
  StreetCheat: true,
  WardLogistics: true,
  ShiftFuel: false,
  Expectations: false,
}

const VOTE_KEY = 'prac.hospital.votes'

export interface HospitalProfileProps {
  slug: string
}

export function HospitalProfile({ slug }: HospitalProfileProps) {
  const [now, setNow] = React.useState(() => Date.now())
  // Seed from cache so revisiting a hospital is instant (no loading flash).
  const [hospital, setHospital] = React.useState<Hospital | null>(() => getCachedHospitalBySlug(slug))
  const [hospitalsList, setHospitalsList] = React.useState<Hospital[]>([])
  const [tips, setTips] = React.useState<Tip[]>(() => getCachedTips(slug) ?? [])
  const [refCards, setRefCards] = React.useState<ReferenceCard[]>([])
  const [loading, setLoading] = React.useState(() => !getCachedHospitalBySlug(slug))
  const [loadError, setLoadError] = React.useState(false)
  const [votes, setVotes] = React.useState<VoteMap>({})
  const [sort, setSort] = React.useState<SortMode>('helpful')
  const [expanded, setExpanded] = React.useState<Record<TipCategory, boolean>>(DEFAULT_OPEN)
  const [form, setForm] = React.useState<{ open: boolean; category: TipCategory | null }>({
    open: false,
    category: null,
  })

  React.useEffect(() => {
    setNow(Date.now())
    try {
      const raw = localStorage.getItem(VOTE_KEY)
      if (raw) setVotes(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    let active = true
    if (!getCachedHospitalBySlug(slug)) setLoading(true)
    setLoadError(false)
    ;(async () => {
      try {
        const h = await fetchHospitalBySlug(slug)
        if (!active) return
        setHospital(h)
        if (!h) return
        const [t, r, list] = await Promise.all([
          fetchTips(h.id),
          fetchRefCards(h.id),
          fetchHospitals(),
        ])
        if (!active) return
        setTips(t)
        setRefCards(r)
        setHospitalsList(list)
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [slug])

  function persistVotes(next: VoteMap) {
    try {
      localStorage.setItem(VOTE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  async function vote(tipId: string, dir: Exclude<VoteDir, null>) {
    const prevDir = votes[tipId] ?? null
    const newDir: VoteDir = prevDir === dir ? null : dir
    const snapshot = tips

    // Optimistic: adjust this tip's counts and the active arrow immediately.
    setTips((cur) =>
      cur.map((t) => {
        if (t.id !== tipId) return t
        let { upvotes, downvotes } = t
        if (prevDir === 'up') upvotes -= 1
        if (prevDir === 'down') downvotes -= 1
        if (newDir === 'up') upvotes += 1
        if (newDir === 'down') downvotes += 1
        return { ...t, upvotes: Math.max(upvotes, 0), downvotes: Math.max(downvotes, 0) }
      })
    )
    const nextVotes = { ...votes, [tipId]: newDir }
    setVotes(nextVotes)
    persistVotes(nextVotes)

    try {
      const counts = await castVote(tipId, dir === 'up' ? 1 : -1)
      // Reconcile with the authoritative server counts.
      setTips((cur) =>
        cur.map((t) => (t.id === tipId ? { ...t, upvotes: counts.upvotes, downvotes: counts.downvotes } : t))
      )
    } catch {
      setTips(snapshot) // revert
      const reverted = { ...votes, [tipId]: prevDir }
      setVotes(reverted)
      persistVotes(reverted)
    }
  }

  const openForm = (category: TipCategory | null) => setForm({ open: true, category })
  const closeForm = () => setForm((f) => ({ ...f, open: false }))

  const brand = (
    <div className="flex items-center justify-between">
      <Link href="/hospitals" className="font-display text-2xl font-semibold tracking-tight">
        Prac<span className="text-teal">.</span>
      </Link>
      <Link href="/hospitals" className="text-sm font-medium text-teal-deep hover:text-ink">
        ← All hospitals
      </Link>
    </div>
  )

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-5 py-8 pb-28">
        {brand}
        <p className="mt-10 text-center text-sm text-ink-faint">Loading…</p>
      </main>
    )
  }

  if (!hospital) {
    return (
      <main className="mx-auto max-w-xl px-5 py-8 pb-28">
        {brand}
        <p className="mt-10 text-center text-sm text-ink-soft">
          We don’t have a directory for this hospital yet.
        </p>
        <p className="mt-3 text-center">
          <Link href="/hospitals" className="text-sm font-semibold text-teal-deep hover:text-ink">
            Browse all hospitals
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-8 pb-28">
      {brand}

      {/* Header */}
      <p className="mt-8 font-mono text-[11px] uppercase tracking-wider text-teal-deep">
        Hospital directory · {hospital.region}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight">
        {hospital.name}
      </h1>
      <p className="mt-1 text-sm text-ink-faint">{hospital.location}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{hospital.intro}</p>

      {/* Trust signal */}
      <div className="mt-5 flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-new text-teal-deep">
          <Check className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-[13px] leading-snug">
          <b className="font-semibold">Curated by {hospital.curatedBy}</b>
          {tips.length > 0 && (
            <> · {tips.length} tip{tips.length === 1 ? '' : 's'} published</>
          )}
          <br />
          <span className="text-ink-faint">
            Every tip is timestamped and human-reviewed before it’s published.
          </span>
        </span>
      </div>

      {/* Scope guardrail */}
      <p className="mt-4 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-faint">
        Hospital-wide logistics only: parking, access, amenities, culture. Not ward-specific tips,
        staff gossip, patient details or confidential operations.
      </p>

      {/* Sort + add */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-line bg-surface p-1">
          {(
            [
              ['helpful', 'Most helpful'],
              ['latest', 'Latest verified'],
            ] as [SortMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={sort === mode}
              onClick={() => setSort(mode)}
              className={`min-h-[40px] rounded-xl px-3 text-[13px] font-medium transition ${
                sort === mode ? 'bg-new text-teal-deep' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="text-sm font-semibold text-teal-deep hover:text-ink"
        >
          + Share a tip
        </button>
      </div>

      {/* Category sections */}
      {loadError ? (
        <p className="mt-8 rounded-card border border-flag-line bg-flag-bg p-4 text-center text-sm text-flag-ink">
          Couldn’t load tips just now. Check your connection and try again.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {CATEGORIES.map((meta) => (
            <CategorySection
              key={meta.id}
              categoryId={meta.id}
              tips={tips.filter((t) => t.category === meta.id)}
              refCards={refCards.filter((r) => r.category === meta.id)}
              now={now}
              sort={sort}
              votes={votes}
              onVote={vote}
              open={expanded[meta.id]}
              onToggle={() => setExpanded((e) => ({ ...e, [meta.id]: !e[meta.id] }))}
              onAdd={() => openForm(meta.id)}
            />
          ))}
        </div>
      )}

      <p className="mt-8 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-faint">
        Crowd-sourced and reviewed practical guidance, not official hospital instruction. Things
        change: always read the signage and check with your facilitator or the hospital.
      </p>

      <SubmissionForm
        open={form.open}
        onClose={closeForm}
        hospitals={hospitalsList}
        defaultHospitalId={hospital.id}
        defaultCategory={form.category}
      />
      <BottomNav />
    </main>
  )
}

// ── Category section ─────────────────────────────────────────────────────────
type SectionState = 'populate' | 'hybrid' | 'sparse'

function CategorySection({
  categoryId,
  tips,
  refCards,
  now,
  sort,
  votes,
  onVote,
  open,
  onToggle,
  onAdd,
}: {
  categoryId: TipCategory
  tips: Tip[]
  refCards: ReferenceCard[]
  now: number
  sort: SortMode
  votes: VoteMap
  onVote: (id: string, dir: Exclude<VoteDir, null>) => void
  open: boolean
  onToggle: () => void
  onAdd: () => void
}) {
  const meta = categoryMeta(categoryId)
  const state: SectionState =
    tips.length >= 3 ? 'populate' : refCards.length >= 1 ? 'hybrid' : 'sparse'

  const sorted = [...tips].sort((a, b) =>
    sort === 'latest'
      ? new Date(b.verificationDate).getTime() - new Date(a.verificationDate).getTime()
      : scoreTip(b, now) - scoreTip(a, now)
  )

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.tint} text-base`}>
          {meta.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold leading-tight tracking-tight">
            {meta.label}
          </span>
          <span className="text-xs text-ink-faint">
            {tips.length > 0 ? `${tips.length} tip${tips.length === 1 ? '' : 's'}` : 'No tips yet'}
            {refCards.length > 0 && ` · ${refCards.length} official`}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-faint transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-line-soft p-4">
          <p className="text-sm leading-relaxed text-ink-soft">{meta.blurb}</p>

          {meta.caution && (
            <p className="rounded-field border border-flag-line bg-flag-bg px-3 py-2 text-xs leading-relaxed text-flag-ink">
              <span aria-hidden>⚑ </span>
              {meta.caution}
            </p>
          )}

          {sorted.map((t) => (
            <TipCardView key={t.id} tip={t} now={now} dir={votes[t.id] ?? null} onVote={onVote} onRefresh={onAdd} />
          ))}

          {state === 'hybrid' && (
            <>
              <p className="text-xs font-medium text-ink-soft">
                We’ve started this one, help us finish it.
              </p>
              {refCards.map((r) => (
                <ReferenceCardView key={r.id} card={r} />
              ))}
              <AddRow label={meta.cta} onAdd={onAdd} />
            </>
          )}

          {state === 'populate' && <AddRow label={meta.cta} onAdd={onAdd} />}

          {state === 'sparse' && <SparseCallout meta={meta} onAdd={onAdd} />}
        </div>
      )}
    </section>
  )
}

function AddRow({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="min-h-[44px] w-full rounded-field border border-line bg-paper text-sm font-semibold text-teal-deep transition hover:border-sage-300"
    >
      + {label}
    </button>
  )
}

function SparseCallout({
  meta,
  onAdd,
}: {
  meta: ReturnType<typeof categoryMeta>
  onAdd: () => void
}) {
  return (
    <div className="rounded-card border border-dashed border-sage-300 bg-paper p-4 text-center">
      <div className="text-2xl" aria-hidden>
        {meta.emoji}
      </div>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
        {meta.empathyPrompt}
      </p>
      {meta.subPrompts && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {meta.subPrompts.map((s) => (
            <span
              key={s.key}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-soft"
            >
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-teal px-5 text-[15px] font-semibold text-teal-ink shadow-[0_6px_18px_rgba(78,205,196,.35)] transition hover:bg-teal-bright"
        >
          + {meta.cta}
        </button>
      </div>
    </div>
  )
}

// ── Tip card ──────────────────────────────────────────────────────────────────
function TipCardView({
  tip,
  now,
  dir,
  onVote,
  onRefresh,
}: {
  tip: Tip
  now: number
  dir: VoteDir
  onVote: (id: string, d: Exclude<VoteDir, null>) => void
  onRefresh: () => void
}) {
  const net = tip.upvotes - tip.downvotes
  const rel = relevancePct(tip.upvotes, tip.downvotes)
  const stale = isStale(tip.verificationDate, now)
  const aging = isAgingStreetCheat(tip, now)
  const opacity = stale ? 'opacity-50' : aging ? 'opacity-75' : ''

  return (
    <div className={`flex gap-1 rounded-card border border-line bg-surface p-3 transition ${opacity}`}>
      {/* Vote panel */}
      <div className="flex shrink-0 flex-col items-center">
        <button
          type="button"
          aria-label="This was helpful"
          aria-pressed={dir === 'up'}
          onClick={() => onVote(tip.id, 'up')}
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
            dir === 'up' ? 'text-teal-deep' : 'text-ink-faint hover:text-ink'
          }`}
        >
          ▲
        </button>
        <span
          className={`font-mono text-sm font-semibold tabular-nums ${
            net > 0 ? 'text-teal-deep' : net < 0 ? 'text-flag' : 'text-ink-soft'
          }`}
        >
          {net}
        </span>
        <button
          type="button"
          aria-label="This wasn’t helpful"
          aria-pressed={dir === 'down'}
          onClick={() => onVote(tip.id, 'down')}
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
            dir === 'down' ? 'text-flag' : 'text-ink-faint hover:text-ink'
          }`}
        >
          ▼
        </button>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-1">
        {tip.subCategory && (
          <span className="mb-1 inline-block rounded bg-sage-100 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {tip.subCategory}
          </span>
        )}
        <p className="text-sm leading-relaxed text-ink">{tip.text}</p>

        {/* Verification + meta */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
          {tip.verifiedBy ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal-deep">
              <Check className="h-3.5 w-3.5" aria-hidden /> Verified by {tip.verifiedBy}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>◔</span> {tip.submittedBy}
            </span>
          )}
          {tip.confidenceLevel && !tip.verifiedBy && (
            <span className="rounded bg-paper px-1.5 py-0.5 text-[11px]">
              {tip.confidenceLevel} confidence
            </span>
          )}
          <span aria-hidden>·</span>
          <span>Checked {relativeTime(tip.verificationDate, now)}</span>
        </div>

        <div className="mt-1 font-mono text-[11px] text-ink-faint">
          {rel === null ? (
            <>No votes yet</>
          ) : (
            <>
              Relevance {rel}% · +{tip.upvotes} / −{tip.downvotes}
            </>
          )}
        </div>

        {stale && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-field border border-flag-line bg-flag-bg px-3 py-2 text-xs text-flag-ink">
            <span>This tip might be outdated.</span>
            <button
              type="button"
              onClick={onRefresh}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              Refresh this info?
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Reference card (read-only) ─────────────────────────────────────────────────
function ReferenceCardView({ card }: { card: ReferenceCard }) {
  return (
    <a
      href={card.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-card border border-line bg-paper p-3 transition hover:border-sage-300"
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Official source
      </span>
      <p className="mt-1 text-sm leading-relaxed text-ink">{card.text}</p>
      <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-deep">
        {card.sourceLabel} <span aria-hidden>↗</span>
      </span>
    </a>
  )
}
