'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { createClient } from '@/src/auth/client'
import { Button, Card } from '@/src/ui/components'
import { HospitalAdmin } from '@/src/ui/hospital/HospitalAdmin'

// Moderator-only admin area: the hospital-directory moderation queues + the
// hospital editor. Gated client-side for UX; the real boundary is RLS
// (profiles.is_moderator) at the data layer.

interface PendingTip {
  id: string
  category: string
  text: string
  submitted_at: string
  hospital_name: string
}

interface PendingRequest {
  id: string
  name: string
  note: string | null
  submitted_by: string
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isModerator, setIsModerator] = useState(false)
  const [pending, setPending] = useState<PendingTip[]>([])
  const [requests, setRequests] = useState<PendingRequest[]>([])

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [loading, user, router])

  // Hospital-tip moderation queue (global moderators only — profiles.is_moderator).
  const loadPending = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('hospital_tips')
      .select('id, category, text, submitted_at, hospitals(name)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
    type Row = {
      id: string
      category: string
      text: string
      submitted_at: string
      hospitals: { name: string } | { name: string }[] | null
    }
    const rows = (data ?? []) as unknown as Row[]
    setPending(
      rows.map((t) => {
        const h = Array.isArray(t.hospitals) ? t.hospitals[0] : t.hospitals
        return {
          id: t.id,
          category: t.category,
          text: t.text,
          submitted_at: t.submitted_at,
          hospital_name: h?.name ?? '—',
        }
      })
    )
  }, [])

  // Hospital-request queue (global moderators only).
  const loadRequests = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('hospital_requests')
      .select('id, name, note, submitted_by, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setRequests((data as PendingRequest[]) ?? [])
  }, [])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    void (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_moderator')
        .eq('id', user.id)
        .maybeSingle()
      const mod = Boolean(prof?.is_moderator)
      setIsModerator(mod)
      if (mod) {
        await loadPending()
        await loadRequests()
      }
      setReady(true)
    })()
  }, [user, loadPending, loadRequests])

  async function triageRequest(id: string, status: 'reviewed' | 'dismissed') {
    const supabase = createClient()
    const { error } = await supabase.from('hospital_requests').update({ status }).eq('id', id)
    if (error) {
      setNotice(error.message)
      return
    }
    setRequests((p) => p.filter((r) => r.id !== id))
    setNotice(status === 'reviewed' ? 'Request marked reviewed.' : 'Request dismissed.')
  }

  async function moderate(id: string, publish: boolean) {
    const supabase = createClient()
    const { error } = await supabase
      .from('hospital_tips')
      .update(
        publish
          ? { status: 'published', is_published: true }
          : { status: 'rejected', is_published: false }
      )
      .eq('id', id)
    if (error) {
      setNotice(error.message)
      return
    }
    setPending((p) => p.filter((t) => t.id !== id))
    setNotice(publish ? 'Tip published.' : 'Tip rejected.')
  }

  if (loading || !user || !ready) {
    return <p className="p-6 text-sm text-slate-500">Loading…</p>
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold">Prac · Admin</span>
          <a href="/reflections" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400">
            Student view
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {notice && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">{notice}</p>
        )}

        {!isModerator ? (
          <Card>
            <p className="text-sm text-slate-500">You don’t have admin access.</p>
          </Card>
        ) : (
          <>
            <div>
              <h2 className="mb-2 font-medium">Hospital tips — moderation</h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Community submissions waiting for review. Approve to publish, or reject. Nothing is
                public until you approve it.
              </p>
              {pending.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-500">Nothing waiting for review.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {pending.map((t) => (
                    <Card key={t.id} className="space-y-2">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t.hospital_name} · {t.category} ·{' '}
                        {new Date(t.submitted_at).toLocaleDateString()}
                      </div>
                      <p className="text-sm">{t.text}</p>
                      <div className="flex gap-2">
                        <Button onClick={() => moderate(t.id, true)}>Approve</Button>
                        <Button variant="danger" onClick={() => moderate(t.id, false)}>
                          Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-2 font-medium">Hospital requests</h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Hospitals students have asked for. Add it via the directory below, then mark reviewed —
                or dismiss.
              </p>
              {requests.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-500">No requests waiting.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {requests.map((r) => (
                    <Card key={r.id} className="space-y-2">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {r.submitted_by} · {new Date(r.created_at).toLocaleDateString()}
                      </div>
                      <p className="text-sm font-medium">{r.name}</p>
                      {r.note && <p className="text-sm text-slate-600 dark:text-slate-300">{r.note}</p>}
                      <div className="flex gap-2">
                        <Button onClick={() => triageRequest(r.id, 'reviewed')}>Mark reviewed</Button>
                        <Button variant="danger" onClick={() => triageRequest(r.id, 'dismissed')}>
                          Dismiss
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <HospitalAdmin />
          </>
        )}
      </main>
    </div>
  )
}
