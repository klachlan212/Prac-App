'use client'

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/src/db/schema'
import { flush, pull } from './engine'

export type SyncState = 'offline' | 'syncing' | 'pending' | 'synced'

// A quiet, honest sync-state indicator. Writing is never blocked on this
// (CLAUDE.md §3) — it only reports.
export function useSync(userId: string | null): { state: SyncState; online: boolean } {
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const pending = useLiveQuery(() => db.syncQueue.count(), [], 0)

  useEffect(() => {
    setOnline(navigator.onLine)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function run() {
      if (!navigator.onLine) return
      setSyncing(true)
      try {
        await flush()
        if (!cancelled && userId) await pull(userId)
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }

    void run()
    const onOnline = () => void run()
    window.addEventListener('online', onOnline)
    const interval = setInterval(() => void run(), 20000)

    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
      clearInterval(interval)
    }
  }, [userId, pending])

  const state: SyncState = !online
    ? 'offline'
    : syncing
      ? 'syncing'
      : (pending ?? 0) > 0
        ? 'pending'
        : 'synced'

  return { state, online }
}
