'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { applyTheme, getTheme } from '@/src/lib/localSettings'
import { useSync, type SyncState } from '@/src/sync/useSync'

const SYNC_LABEL: Record<SyncState, string> = {
  offline: 'Offline — saved on device',
  syncing: 'Syncing…',
  pending: 'Saving…',
  synced: 'All saved',
}

const SYNC_DOT: Record<SyncState, string> = {
  offline: 'bg-amber-400',
  syncing: 'bg-teal animate-pulse',
  pending: 'bg-teal',
  synced: 'bg-teal-deep',
}

// Bottom tab bar (spec: [Home] [Reflect] [Resources] [Profile]). Resources and
// Profile are hubs so new categories/sections scale without adding tabs.
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
    match: (p) => p.startsWith('/resources'),
    Icon: ResourcesIcon,
  },
  {
    href: '/profile',
    label: 'Profile',
    match: (p) => p.startsWith('/profile') || p.startsWith('/export') || p.startsWith('/settings'),
    Icon: ProfileIcon,
  },
]

export function AppShell({
  userId,
  children,
}: {
  userId: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { state } = useSync(userId)

  useEffect(() => {
    applyTheme(getTheme())
  }, [])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link
            href="/reflections"
            className="font-display text-xl font-semibold tracking-tight text-ink"
          >
            Prac<span className="text-teal">.</span>
          </Link>
          <span
            className="flex items-center gap-1.5 text-xs text-ink-faint"
            title={SYNC_LABEL[state]}
          >
            <span className={`h-2 w-2 rounded-full ${SYNC_DOT[state]}`} aria-hidden />
            <span className="hidden sm:inline">{SYNC_LABEL[state]}</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-28">{children}</main>

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
                className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-[11px] font-medium transition ${
                  active ? 'text-teal-deep' : 'text-ink-faint hover:text-ink'
                }`}
              >
                <tab.Icon active={active} />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// Minimal line icons (filled accent when active). Stroke uses currentColor.
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
      <path
        d="M5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
