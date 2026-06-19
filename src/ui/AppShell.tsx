'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/src/auth/client'
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

const NAV = [
  { href: '/reflections', label: 'Reflections' },
  { href: '/export', label: 'Export' },
  { href: '/settings', label: 'Settings' },
]

export function AppShell({
  userId,
  children,
}: {
  userId: string | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSync(userId)

  useEffect(() => {
    applyTheme(getTheme())
  }, [])

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/sign-in')
  }

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
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 text-xs text-ink-faint"
              title={SYNC_LABEL[state]}
            >
              <span className={`h-2 w-2 rounded-full ${SYNC_DOT[state]}`} aria-hidden />
              <span className="hidden sm:inline">{SYNC_LABEL[state]}</span>
            </span>
            <button
              onClick={signOut}
              className="min-h-[44px] text-sm font-medium text-ink-soft hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-2xl gap-1 px-2 pb-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-new text-teal-deep'
                    : 'text-ink-soft hover:bg-sage-100 hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  )
}
