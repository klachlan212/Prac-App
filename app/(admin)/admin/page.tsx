'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { createClient } from '@/src/auth/client'
import { Button, Card, Field, Input } from '@/src/ui/components'

// Role-gated admin area. It shows operational adherence only — never reflection
// content or tags. Metrics come solely from the get_org_adherence security-
// definer function (CLAUDE.md §4.1). A compromised admin still cannot reach
// content, because the database enforces it.

interface AdminOrg {
  id: string
  name: string
}

interface AdherenceRow {
  user_id: string
  full_name: string
  cohort: string | null
  membership_status: string
  reflection_count: number
  last_reflected_on: string | null
  on_track: boolean
}

interface PendingTip {
  id: string
  category: string
  text: string
  submitted_at: string
  hospital_name: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [orgs, setOrgs] = useState<AdminOrg[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [roster, setRoster] = useState<AdherenceRow[]>([])
  const [ready, setReady] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [isModerator, setIsModerator] = useState(false)
  const [pending, setPending] = useState<PendingTip[]>([])

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [loading, user, router])

  const loadOrgs = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('memberships')
      .select('org_id, role, organizations(name)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
    const list: AdminOrg[] = (data ?? [])
      .map((m) => {
        const org = m.organizations as unknown as { name: string } | null
        return org ? { id: m.org_id as string, name: org.name } : null
      })
      .filter((o): o is AdminOrg => o !== null)
    setOrgs(list)
    if (list.length > 0 && !selected) setSelected(list[0].id)
    setReady(true)
  }, [user, selected])

  useEffect(() => {
    void loadOrgs()
  }, [loadOrgs])

  const loadRoster = useCallback(async (orgId: string) => {
    const supabase = createClient()
    const { data } = await supabase.rpc('get_org_adherence', { p_org_id: orgId })
    setRoster((data as AdherenceRow[]) ?? [])
  }, [])

  useEffect(() => {
    if (selected) void loadRoster(selected)
  }, [selected, loadRoster])

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
      if (mod) await loadPending()
    })()
  }, [user, loadPending])

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

  async function createOrg() {
    if (!newOrgName.trim()) return
    const supabase = createClient()
    const { data, error } = await supabase.rpc('create_organization', { p_name: newOrgName.trim() })
    if (error) {
      setNotice(error.message)
      return
    }
    setNewOrgName('')
    setNotice('Organization created.')
    await loadOrgs()
    if (typeof data === 'string') setSelected(data)
  }

  async function invite() {
    if (!selected || !inviteEmail.trim()) return
    const supabase = createClient()
    const expires = new Date()
    expires.setDate(expires.getDate() + 14)
    const { error } = await supabase.from('invitations').insert({
      org_id: selected,
      email: inviteEmail.trim().toLowerCase(),
      role: 'student',
      token: crypto.randomUUID(),
      status: 'pending',
      expires_at: expires.toISOString(),
    })
    if (error) {
      setNotice(error.message)
      return
    }
    setInviteEmail('')
    setNotice('Invitation recorded.')
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

        {isModerator && (
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
        )}

        {orgs.length === 0 ? (
          <Card className="space-y-3">
            <h2 className="font-medium">Create your organization</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You don’t administer any organizations yet.
            </p>
            <div className="flex gap-2">
              <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="e.g. ACU Nursing 2026" />
              <Button onClick={createOrg}>Create</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Organization</label>
              <select
                value={selected ?? ''}
                onChange={(e) => setSelected(e.target.value)}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <Card className="space-y-3">
              <h2 className="font-medium">Invite a student</h2>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="student@university.edu.au"
                />
                <Button onClick={invite}>Invite</Button>
              </div>
            </Card>

            <div>
              <h2 className="mb-2 font-medium">Roster & adherence</h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Counts only — no reflection content is ever visible here.
              </p>
              {roster.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-500">No members yet.</p>
                </Card>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Cohort</th>
                        <th className="px-3 py-2">Reflections</th>
                        <th className="px-3 py-2">Last</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((r) => (
                        <tr key={r.user_id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2">{r.full_name}</td>
                          <td className="px-3 py-2">{r.cohort ?? '—'}</td>
                          <td className="px-3 py-2">{r.reflection_count}</td>
                          <td className="px-3 py-2">{r.last_reflected_on ?? '—'}</td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                r.on_track
                                  ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }
                            >
                              {r.on_track ? 'On track' : 'Behind'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
