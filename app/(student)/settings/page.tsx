'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { createClient } from '@/src/auth/client'
import { db } from '@/src/db/schema'
import { getProfile, updateProfile } from '@/src/data/profile'
import { getReminderChannel, setReminderChannel } from '@/src/lib/localSettings'
import type { ReminderChannel } from '@/src/data/types'
import { AppShell } from '@/src/ui/AppShell'
import { Button, Card, Field, Input } from '@/src/ui/components'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SELECT =
  'min-h-[48px] w-full rounded-field border border-line bg-surface px-4 text-base text-ink shadow-card outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30'

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [ready, setReady] = useState(false)
  const [reminderDay, setReminderDay] = useState(0)
  const [reminderTime, setReminderTime] = useState('18:00')
  const [channel, setChannel] = useState<ReminderChannel>('email')
  const [taggingOn, setTaggingOn] = useState(true)
  const [saved, setSaved] = useState(false)

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
      setReminderDay(profile.reminderDay)
      setReminderTime(profile.reminderTime ?? '18:00')
      setTaggingOn(profile.taggingOn)
      setChannel(getReminderChannel())
      setReady(true)
    })()
  }, [user, router])

  async function save() {
    if (!user) return
    await updateProfile(user.id, { reminderDay, reminderTime, taggingOn })
    setReminderChannel(channel)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function deleteAccount() {
    if (!user) return
    if (!confirm('Delete your account and ALL reflections permanently? This cannot be undone.')) return
    const supabase = createClient()
    // Owner-scoped delete; cascades to placements, reflections, skills, and flags.
    await supabase.from('profiles').delete().eq('id', user.id)
    await db.delete()
    await supabase.auth.signOut()
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
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Settings<span className="text-teal">.</span>
        </h1>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Reminders</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day" htmlFor="day">
              <select
                id="day"
                value={reminderDay}
                onChange={(e) => setReminderDay(Number(e.target.value))}
                className={SELECT}
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Time" htmlFor="time">
              <Input id="time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Channel" htmlFor="channel">
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ReminderChannel)}
              className={SELECT}
            >
              <option value="email">Email</option>
              <option value="push">Web push (if installed)</option>
              <option value="off">Off</option>
            </select>
          </Field>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Assistance</h2>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-soft">On-device tag suggestions</span>
            <input
              type="checkbox"
              checked={taggingOn}
              onChange={(e) => setTaggingOn(e.target.checked)}
              className="h-6 w-6 accent-teal"
            />
          </label>
        </Card>

        <div className="flex items-center gap-3">
          <Button className="w-auto px-6" onClick={save}>
            Save settings
          </Button>
          {saved && <span className="text-sm font-medium text-teal-deep">Saved</span>}
        </div>

        <Card className="space-y-3 border-flag-line">
          <h2 className="font-display text-lg font-semibold text-flag">Account</h2>
          <p className="text-sm text-ink-soft">
            Deleting your account removes all your reflections permanently from this device and the
            server.
          </p>
          <Button variant="danger" className="w-auto px-5" onClick={deleteAccount}>
            Delete account &amp; all content
          </Button>
        </Card>
      </div>
    </AppShell>
  )
}
