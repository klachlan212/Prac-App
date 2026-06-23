'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { getProfile } from '@/src/data/profile'
import { AppShell } from '@/src/ui/AppShell'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/src/ui/components'

// Resources hub (spec tab bar). A hub so new categories scale without new tabs.
export default function ResourcesPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [ready, setReady] = useState(false)

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
      setReady(true)
    })()
  }, [user, router])

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
            Resources<span className="text-teal">.</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Practical help for placement, beyond your own reflections.
          </p>
        </div>

        <Link href="/hospitals" className="block">
          <Card className="flex items-center gap-3 transition hover:border-sage-300">
            <span className="text-xl" aria-hidden>
              🏥
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Hospitals</span>
              <span className="block text-xs text-ink-soft">
                Parking, access, food and culture, by hospital.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
          </Card>
        </Link>

        <Card className="flex items-center gap-3 opacity-75">
          <span className="text-xl" aria-hidden>
            🩺
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Specialties</span>
            <span className="block text-xs text-ink-soft">
              What each ward feels like and the skills it tends to surface.
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
            Coming soon
          </span>
        </Card>
      </div>
    </AppShell>
  )
}
