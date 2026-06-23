'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { applyTheme, getTheme } from '@/src/lib/localSettings'
import { useSync, type SyncState } from '@/src/sync/useSync'
import { BottomNav } from './BottomNav'

const SYNC_LABEL: Record<SyncState, string> = {
  offline: 'Offline · saved on device',
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

export function AppShell({
  userId,
  children,
}: {
  userId: string | null
  children: React.ReactNode
}) {
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

      <BottomNav />
    </div>
  )
}
