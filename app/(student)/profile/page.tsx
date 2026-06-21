'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { createClient } from '@/src/auth/client'
import { getProfile } from '@/src/data/profile'
import { AppShell } from '@/src/ui/AppShell'
import { Button, Card } from '@/src/ui/components'

// Profile hub (spec tab bar): Portfolio / Export, Settings, and sign-out.
export default function ProfilePage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [ready, setReady] = useState(false)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    void (async () => {
      const profile = await getProfile(user.id)
      if (!profile) {
        router.replace('/onboarding')
        return
      }
      setFullName(profile.fullName)
      setReady(true)
    })()
  }, [user, router])

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/sign-in')
  }

  if (loading || !user || !ready) {
    return (
      <AppShell userId={user?.id ?? null}>
        <p className="text-sm text-ink-faint">Loading…</p>
      </AppShell>
    )
  }

  return (
    <AppShell userId={user.id}>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Profile<span className="text-teal">.</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {fullName ? `${fullName} · ` : ''}
            {user.email}
          </p>
        </div>

        <Link href="/export" className="block">
          <Card className="flex items-center gap-3 transition hover:border-sage-300">
            <span className="text-xl" aria-hidden>
              📄
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Portfolio / Export</span>
              <span className="block text-xs text-ink-soft">
                Turn your record into a document you keep.
              </span>
            </span>
            <span className="text-sage-300" aria-hidden>
              ›
            </span>
          </Card>
        </Link>

        <Link href="/settings" className="block">
          <Card className="flex items-center gap-3 transition hover:border-sage-300">
            <span className="text-xl" aria-hidden>
              ⚙️
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Settings</span>
              <span className="block text-xs text-ink-soft">
                Reminders, tag suggestions, account.
              </span>
            </span>
            <span className="text-sage-300" aria-hidden>
              ›
            </span>
          </Card>
        </Link>

        <Button variant="quiet" className="w-auto px-5" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </AppShell>
  )
}
