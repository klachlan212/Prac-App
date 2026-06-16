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
  syncing: 'bg-sky-400 animate-pulse',
  pending: 'bg-sky-400',
  synced: 'bg-emerald-500',
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
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/reflections" className="text-lg font-semibold tracking-tight">
            Prac
          </Link>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
              title={SYNC_LABEL[state]}
            >
              <span className={`h-2 w-2 rounded-full ${SYNC_DOT[state]}`} aria-hidden />
              <span className="hidden sm:inline">{SYNC_LABEL[state]}</span>
            </span>
            <button
              onClick={signOut}
              className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
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
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50'
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
