'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { createClient } from '@/src/auth/client'
import { getProfile, updateProfile } from '@/src/data/profile'
import { AppShell } from '@/src/ui/AppShell'
import { ChevronRight } from 'lucide-react'
import { Button, Card, Field, Input } from '@/src/ui/components'

const YEARS: Array<{ label: string; level?: number }> = [
  { label: '1st year', level: 1 },
  { label: '2nd year', level: 2 },
  { label: '3rd year', level: 3 },
  { label: 'Final year', level: 4 },
  { label: 'Postgrad', level: undefined },
]

// Profile hub (spec tab bar): editable details, Portfolio / Export, Settings, sign-out.
export default function ProfilePage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [ready, setReady] = useState(false)
  const [fullName, setFullName] = useState('')
  const [yearLabel, setYearLabel] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
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
      setFullName(profile.fullName)
      const matched = profile.yearLevel ? YEARS.find((y) => y.level === profile.yearLevel) : undefined
      setYearLabel(matched?.label ?? null)
      setReady(true)
    })()
  }, [user, router])

  async function saveDetails() {
    if (!user || !fullName.trim()) return
    setSaving(true)
    const y = YEARS.find((x) => x.label === yearLabel)
    await updateProfile(user.id, { fullName: fullName.trim(), yearLevel: y?.level })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

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

        {/* Editable details */}
        <Card className="space-y-4">
          <Field label="Your name" htmlFor="fullName">
            <Input
              id="fullName"
              value={fullName}
              maxLength={80}
              autoComplete="name"
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium">Year of study</p>
            <div className="flex flex-wrap gap-2">
              {YEARS.map((y) => (
                <button
                  key={y.label}
                  type="button"
                  aria-pressed={yearLabel === y.label}
                  onClick={() => setYearLabel(y.label)}
                  className={`min-h-[44px] rounded-2xl border px-3.5 text-sm font-medium transition ${
                    yearLabel === y.label
                      ? 'border-teal bg-teal text-teal-ink'
                      : 'border-sage-200 bg-surface text-ink hover:border-sage-300'
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button className="w-auto px-5" disabled={saving || !fullName.trim()} onClick={saveDetails}>
              {saving ? 'Saving…' : 'Save details'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-teal-deep">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
                Saved
              </span>
            )}
          </div>
          <p className="text-xs text-ink-faint">
            Your email ({user.email}) is your sign-in — manage it from Settings.
          </p>
        </Card>

        <Link href="/history" className="block">
          <Card className="flex items-center gap-3 transition hover:border-sage-300">
            <span className="text-xl" aria-hidden>
              📚
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Your record</span>
              <span className="block text-xs text-ink-soft">
                Every reflection, filterable by standard, skill type and recency.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
          </Card>
        </Link>

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
            <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
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
            <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
          </Card>
        </Link>

        <Button variant="quiet" className="w-auto px-5" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </AppShell>
  )
}
