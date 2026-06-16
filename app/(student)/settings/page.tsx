'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { createClient } from '@/src/auth/client'
import { db } from '@/src/db/schema'
import { getProfile, updateProfile } from '@/src/data/profile'
import {
  getReminderChannel,
  setReminderChannel,
  getTheme,
  setTheme,
} from '@/src/lib/localSettings'
import type { ReminderChannel, Theme } from '@/src/data/types'
import { AppShell } from '@/src/ui/AppShell'
import { Button, Card, Field, Input } from '@/src/ui/components'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [ready, setReady] = useState(false)
  const [reminderDay, setReminderDay] = useState(0)
  const [reminderTime, setReminderTime] = useState('18:00')
  const [channel, setChannel] = useState<ReminderChannel>('email')
  const [taggingOn, setTaggingOn] = useState(true)
  const [theme, setThemeState] = useState<Theme>('system')
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
      setThemeState(getTheme())
      setReady(true)
    })()
  }, [user, router])

  async function save() {
    if (!user) return
    await updateProfile(user.id, { reminderDay, reminderTime, taggingOn })
    setReminderChannel(channel)
    setTheme(theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function onThemeChange(t: Theme) {
    setThemeState(t)
    setTheme(t)
  }

  async function deleteAccount() {
    if (!user) return
    if (!confirm('Delete your account and ALL reflections permanently? This cannot be undone.')) return
    const supabase = createClient()
    // Owner-scoped delete; cascades to placements, reflections, and tags.
    await supabase.from('profiles').delete().eq('id', user.id)
    await db.delete()
    await supabase.auth.signOut()
    router.replace('/sign-in')
  }

  if (loading || !user || !ready) {
    return (
      <AppShell userId={user?.id ?? null}>
        <p className="text-sm text-slate-500">Loading…</p>
      </AppShell>
    )
  }

  return (
    <AppShell userId={user.id}>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

        <Card className="space-y-4">
          <h2 className="font-medium">Reminders</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day" htmlFor="day">
              <select
                id="day"
                value={reminderDay}
                onChange={(e) => setReminderDay(Number(e.target.value))}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900"
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
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="email">Email</option>
              <option value="push">Web push (if installed)</option>
              <option value="off">Off</option>
            </select>
          </Field>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-medium">Appearance & assistance</h2>
          <Field label="Theme" htmlFor="theme">
            <select
              id="theme"
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as Theme)}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="system">Match system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">On-device tag suggestions</span>
            <input type="checkbox" checked={taggingOn} onChange={(e) => setTaggingOn(e.target.checked)} className="h-6 w-6" />
          </label>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={save}>Save settings</Button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>

        <Card className="space-y-3 border-red-200 dark:border-red-900">
          <h2 className="font-medium text-red-700 dark:text-red-400">Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deleting your account removes all your reflections permanently from this device and the server.
          </p>
          <Button variant="danger" onClick={deleteAccount}>
            Delete account & all content
          </Button>
        </Card>
      </div>
    </AppShell>
  )
}
