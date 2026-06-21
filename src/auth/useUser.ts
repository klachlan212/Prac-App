'use client'

import { useEffect, useState } from 'react'
import { createClient } from './client'

export interface SessionUser {
  id: string
  email?: string
}

// Client hook for the current authenticated user. Identity always comes from
// the Supabase session, never from anything the client could forge (CLAUDE.md §4.1).
export function useUser(): { user: SessionUser | null; loading: boolean } {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return
        setUser(data.user ? { id: data.user.id, email: data.user.email } : null)
        setLoading(false)
      })
      .catch(() => {
        // getUser() hits the network; a failure (bad signal — an expected
        // condition per §3/§5) must still resolve loading or the UI hangs blank.
        if (!active) return
        setUser(null)
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
