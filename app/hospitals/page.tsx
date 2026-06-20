import type { Metadata } from 'next'
import Link from 'next/link'
import { HOSPITALS } from '@/src/content/hospitals'
import { TipCount } from '@/src/ui/hospital/TipCount'

// Public, ungated directory — practical placement logistics, hospital by hospital.
// Like the ward guides, it lives outside the auth group so it catches search and
// shared links and works without an account.

export const metadata: Metadata = {
  title: 'Hospital directory — placement logistics · Prac.',
  description:
    'Parking, access, food and culture for Australian hospital placements — the practical stuff, hospital by hospital. Curated and human-reviewed.',
}

const REGIONS = ['Melbourne', 'Geelong'] as const

export default function HospitalsPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="font-display text-2xl font-semibold tracking-tight">
        Prac<span className="text-teal">.</span>
      </div>

      <p className="mt-8 font-mono text-[11px] uppercase tracking-wider text-teal-deep">
        Hospital directory
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight">
        The practical stuff, before day one<span className="text-teal">.</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Where to park, how to get in, where to eat, and what shifts actually feel like — pooled from
        students who’ve been there and checked by a real nurse. So the night before a 6am start is
        one less thing to dread.
      </p>

      <p className="mt-4 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-faint">
        Hospital-wide logistics only — no ward-specific tips, gossip, patient details or
        confidential operations.
      </p>

      {REGIONS.map((region) => {
        const inRegion = HOSPITALS.filter((h) => h.region === region)
        if (inRegion.length === 0) return null
        return (
          <section key={region} className="mt-9">
            <h2 className="font-display text-xl font-semibold tracking-tight">{region}</h2>
            <div className="mt-3 space-y-2.5">
              {inRegion.map((h) => (
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
        )
      })}

      <p className="mt-9 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-faint">
        Crowd-sourced and reviewed practical guidance — not official hospital instruction. Things
        change: always read the signage and check with your facilitator.
      </p>
    </main>
  )
}
