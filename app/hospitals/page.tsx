import type { Metadata } from 'next'
import { HospitalsDirectory } from '@/src/ui/hospital/HospitalsDirectory'
import { BottomNav } from '@/src/ui/BottomNav'
import { SiteFooter } from '@/src/ui/SiteFooter'

// Public, ungated directory — practical placement logistics, hospital by hospital.
// Like the ward guides, it lives outside the auth group so it catches search and
// shared links and works without an account. The roster itself loads from the DB
// (HospitalsDirectory) so moderator additions show up without a redeploy.

export const metadata: Metadata = {
  title: 'Hospital directory · placement logistics · Prac.',
  description:
    'Parking, access, food and culture for Australian hospital placements: the practical stuff, hospital by hospital. Curated and human-reviewed.',
}

export default function HospitalsPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-10 pb-28">
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
        Where to park, how to get in, where to eat, and what shifts actually feel like, pooled from
        students who’ve been there and checked by a real nurse. So the night before a 7am start is
        one less thing to dread.
      </p>

      <p className="mt-4 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-faint">
        Hospital-wide logistics only: no ward-specific tips, gossip, patient details or
        confidential operations.
      </p>

      <HospitalsDirectory />

      <p className="mt-9 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-faint">
        Crowd-sourced and reviewed practical guidance, not official hospital instruction. Things
        change: always read the signage and check with your facilitator.
      </p>
      <SiteFooter />
      <BottomNav />
    </main>
  )
}
