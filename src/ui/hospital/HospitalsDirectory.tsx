'use client'

import * as React from 'react'
import Link from 'next/link'
import { fetchHospitals, getCachedHospitals } from '@/src/data/hospitals'
import { AUS_STATES, regionGroup, STATE_CAPITAL, type AusState, type Hospital } from '@/src/content/hospitals'
import { TipCount } from './TipCount'

// DB-driven roster so moderator-added hospitals appear without a redeploy.
// Filterable by state; within a state, the capital city is one group and
// everything else falls under "<STATE> Regional/Rural/Remote".
export function HospitalsDirectory() {
  // Seed from cache so coming back to the list is instant (no loading flash).
  const [hospitals, setHospitals] = React.useState<Hospital[] | null>(() => getCachedHospitals())
  const [error, setError] = React.useState(false)
  const [stateFilter, setStateFilter] = React.useState<AusState | null>(null)

  React.useEffect(() => {
    let active = true
    fetchHospitals()
      .then((h) => active && setHospitals(h))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <p className="mt-9 rounded-card border border-flag-line bg-flag-bg p-4 text-center text-sm text-flag-ink">
        Couldn’t load the directory just now. Check your connection and try again.
      </p>
    )
  }
  if (!hospitals) {
    return <p className="mt-9 text-center text-sm text-ink-faint">Loading…</p>
  }

  // Only offer states we actually have hospitals for, in canonical order.
  const statesPresent = AUS_STATES.filter((s) => hospitals.some((h) => h.state === s))
  const statesToShow = stateFilter ? [stateFilter] : statesPresent

  // Ordered groups: for each state, the capital city first, then its
  // regional/rural/remote group, each only if it has hospitals.
  const groups: { label: string; items: Hospital[] }[] = []
  for (const s of statesToShow) {
    const inState = hospitals.filter((h) => h.state === s)
    const capital = STATE_CAPITAL[s]
    const capitalItems = inState.filter((h) => regionGroup(h) === capital)
    const regionalItems = inState.filter((h) => regionGroup(h) !== capital)
    if (capitalItems.length) groups.push({ label: capital, items: capitalItems })
    if (regionalItems.length) groups.push({ label: `${s} Regional/Rural/Remote`, items: regionalItems })
  }

  const chip = (active: boolean) =>
    `min-h-[44px] rounded-full border px-4 text-sm font-medium transition ${
      active
        ? 'border-teal bg-teal text-white shadow-card'
        : 'border-line bg-surface text-ink-soft hover:border-sage-300'
    }`

  return (
    <>
      {statesPresent.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by state">
          <button type="button" onClick={() => setStateFilter(null)} className={chip(!stateFilter)}>
            All
          </button>
          {statesPresent.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStateFilter(s)}
              className={chip(stateFilter === s)}
              aria-pressed={stateFilter === s}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label} className="mt-9">
          <h2 className="font-display text-xl font-semibold tracking-tight">{group.label}</h2>
          <div className="mt-3 space-y-2.5">
            {group.items.map((h) => (
              <Link
                key={h.id}
                href={`/hospitals/${h.slug}`}
                className="block rounded-card border border-line bg-surface p-4 shadow-card transition hover:border-sage-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold leading-tight tracking-tight">
                      {h.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-faint">{h.location}</p>
                  </div>
                  <TipCount hospitalId={h.id} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{h.intro}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
