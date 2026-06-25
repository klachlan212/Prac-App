import type { Metadata } from 'next'
import type { ComponentType } from 'react'
import {
  HomeScreen,
  PlacementScreen,
  ReflectScreen,
  ExportScreen,
  HospitalScreen,
  GuideScreen,
} from '@/src/ui/landing/featureScreens'

// Internal, unlinked review gallery for the candidate landing "splash screens".
// Not linked from anywhere and not indexed; remove (or repurpose) once the founder
// has picked the keepers and they're wired into the landing.
export const metadata: Metadata = {
  title: 'Feature screens · Prac.',
  robots: { index: false, follow: false },
}

const SCREENS: { label: string; caption: string; Screen: ComponentType }[] = [
  {
    label: 'Your shift, at a glance',
    caption: 'Open the app and you are one tap from logging the day.',
    Screen: HomeScreen,
  },
  {
    label: 'Set up your placement',
    caption: 'Pick your placement type and Prac. tailors the skills to it.',
    Screen: PlacementScreen,
  },
  {
    label: 'Reflect, and it maps itself',
    caption: 'A two-minute reflection, mapped to your NMBA standards automatically.',
    Screen: ReflectScreen,
  },
  {
    label: 'A record you own',
    caption: 'Export to PDF for grad applications, with an honest identifier check.',
    Screen: ExportScreen,
  },
  {
    label: 'Know the hospital first',
    caption: 'Parking, access and culture, from students who have been there.',
    Screen: HospitalScreen,
  },
  {
    label: 'Know the ward first',
    caption: 'What it feels like and the skills you will meet, from a real nurse.',
    Screen: GuideScreen,
  },
]

export default function PreviewPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-wider text-teal-deep">Internal preview</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        Feature screens<span className="text-teal">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Candidate splash screens for the landing page. Review and tell me which to keep; the bulky
        copy gets trimmed once these are locked.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {SCREENS.map(({ label, caption, Screen }) => (
          <div key={label}>
            <h2 className="font-display text-lg font-semibold tracking-tight">{label}</h2>
            <p className="mb-4 mt-1 text-sm leading-relaxed text-ink-soft">{caption}</p>
            <Screen />
          </div>
        ))}
      </div>
    </main>
  )
}
