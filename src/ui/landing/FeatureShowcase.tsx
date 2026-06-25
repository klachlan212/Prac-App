'use client'

import { useState } from 'react'
import { MousePointerClick } from 'lucide-react'
import {
  HomeScreen,
  PlacementScreen,
  ReflectScreen,
  ExportScreen,
  HospitalScreen,
  GuideScreen,
} from './featureScreens'

// Interactive feature showcase for the landing: tap a feature pill to switch the
// phone preview. The instruction line makes the interactivity obvious (students
// don't assume a marketing image is clickable). Covers every key feature.
const FEATURES = [
  { key: 'today', label: 'Today', Screen: HomeScreen, caption: 'Open the app and you are one tap from logging the day.' },
  { key: 'placement', label: 'Placement', Screen: PlacementScreen, caption: 'Pick your placement type and Prac. tailors the skills to it.' },
  { key: 'reflect', label: 'Reflect', Screen: ReflectScreen, caption: 'A two-minute reflection, mapped to your NMBA standards automatically.' },
  { key: 'export', label: 'Export', Screen: ExportScreen, caption: 'Export to PDF for grad applications, with an honest identifier check.' },
  { key: 'hospitals', label: 'Hospitals', Screen: HospitalScreen, caption: 'Parking, access and culture, from students who have been there.' },
  { key: 'guides', label: 'Ward guides', Screen: GuideScreen, caption: 'What it feels like and the skills you will meet, from a real nurse.' },
] as const

export function FeatureShowcase() {
  const [active, setActive] = useState<(typeof FEATURES)[number]['key']>('reflect')
  const current = FEATURES.find((f) => f.key === active) ?? FEATURES[0]
  const Screen = current.Screen

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="flex select-none items-center justify-center gap-1.5 text-sm font-semibold text-teal-deep">
        <MousePointerClick className="h-4 w-4" aria-hidden />
        Tap a feature to explore it
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {FEATURES.map((f) => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            aria-pressed={active === f.key}
            className={`min-h-[40px] select-none rounded-full border px-3.5 text-sm font-semibold transition ${
              active === f.key
                ? 'border-teal bg-teal text-teal-ink shadow-card'
                : 'border-sage-200 bg-surface text-ink-soft hover:border-sage-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-ink-soft">
        {current.caption}
      </p>

      <div className="mt-4">
        <Screen />
      </div>
    </div>
  )
}
