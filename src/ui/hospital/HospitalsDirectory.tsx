'use client'

import * as React from 'react'
import Link from 'next/link'
import { fetchHospitals } from '@/src/data/hospitals'
import type { Hospital } from '@/src/content/hospitals'
import { TipCount } from './TipCount'

// DB-driven roster so moderator-added hospitals appear without a redeploy.
// Grouped by whatever regions exist in the data.
export function HospitalsDirectory() {
  const [hospitals, setHospitals] = React.useState<Hospital[] | null>(null)
  const [error, setError] = React.useState(false)

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

  const regions = Array.from(new Set(hospitals.map((h) => h.region)))

  return (
    <>
      {regions.map((region) => (
        <section key={region} className="mt-9">
          <h2 className="font-display text-xl font-semibold tracking-tight">{region}</h2>
          <div className="mt-3 space-y-2.5">
            {hospitals
              .filter((h) => h.region === region)
              .map((h) => (
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
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {h.intro}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  )
}
