'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/src/auth/client'

// Paths reachable without a session.
const PUBLIC_PATHS = ['/sign-in']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

// Client-side auth gate. This replaces the old Edge middleware, which crashed on
// Vercel with MIDDLEWARE_INVOCATION_FAILED regardless of its contents (even a
// dependency-free cookie check failed). Gating here is purely a navigation
// convenience — the real security boundary remains Postgres RLS, and protected
// pages render their content from the per-device local store, never from the
// server, so an unauthenticated visitor sees no data either way.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      const signedIn = !!session

      if (!signedIn && !isPublicPath(pathname)) {
        router.replace('/sign-in')
        return
      }
      if (signedIn && pathname === '/sign-in') {
        router.replace('/reflections')
        return
      }
      setReady(true)
    })

    return () => {
      active = false
    }
  }, [pathname, router])

  // Hold rendering until the session check resolves so protected content never
  // flashes before a redirect.
  if (!ready) return null
  return <>{children}</>
}
