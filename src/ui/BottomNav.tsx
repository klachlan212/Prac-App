'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// Bottom tab bar (spec: [Home] [Reflect] [Resources] [Profile]). Extracted from
// AppShell so it also persists on the PUBLIC hospital/guide pages (which live
// outside the auth group). Resources lights up on /resources, /hospitals and
// /guides since those all live under the Resources hub.
type IconProps = { active: boolean }
const TABS: Array<{
  href: string
  label: string
  match: (p: string) => boolean
  Icon: (p: IconProps) => React.ReactElement
}> = [
  { href: '/reflections', label: 'Home', match: (p) => p === '/reflections', Icon: HomeIcon },
  {
    href: '/reflections/new',
    label: 'Reflect',
    match: (p) => p.startsWith('/reflections/new') || /^\/reflections\/[^/]+\/edit/.test(p),
    Icon: ReflectIcon,
  },
  {
    href: '/resources',
    label: 'Resources',
    match: (p) =>
      p.startsWith('/resources') || p.startsWith('/hospitals') || p.startsWith('/guides'),
    Icon: ResourcesIcon,
  },
  {
    href: '/profile',
    label: 'Profile',
    match: (p) => p.startsWith('/profile') || p.startsWith('/export') || p.startsWith('/settings'),
    Icon: ProfileIcon,
  },
]

const SEEN_HOSPITALS_KEY = 'prac.seenHospitals'

export function BottomNav() {
  const pathname = usePathname()
  // Temporary "New" dot drawing the eye to the Hospital Directory (it lives under
  // Resources). Self-clears once the student has visited /hospitals — so it's a
  // genuine first-discovery nudge, not permanent chrome. Remove with the Home card.
  const [showHospitalsBadge, setShowHospitalsBadge] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (pathname.startsWith('/hospitals')) {
      localStorage.setItem(SEEN_HOSPITALS_KEY, '1')
      setShowHospitalsBadge(false)
      return
    }
    setShowHospitalsBadge(localStorage.getItem(SEEN_HOSPITALS_KEY) !== '1')
  }, [pathname])

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-xs font-medium transition ${
                active ? 'text-teal-deep' : 'text-ink-faint hover:text-ink'
              }`}
            >
              <span className="relative">
                <tab.Icon active={active} />
                {tab.href === '/resources' && showHospitalsBadge && (
                  <span
                    className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full bg-teal ring-2 ring-paper"
                    aria-label="New"
                  />
                )}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {active && <path d="M9.5 21v-6h5v6" fill="currentColor" opacity="0.25" />}
    </svg>
  )
}

function ReflectIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.18 : 0}
      />
      <path d="m13.5 6 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ResourcesIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h9a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.18 : 0}
      />
      <path d="M16 6h3v12a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function ProfileIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.18 : 0}
      />
      <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
