'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { getUniversities } from '@/src/data/standards'
import { saveProfile, getProfile } from '@/src/data/profile'
import { createPlacement } from '@/src/data/placements'
import type { University } from '@/src/data/types'
import { Button, Card, Field, Input } from '@/src/ui/components'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [universities, setUniversities] = useState<University[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile fields
  const [fullName, setFullName] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [program, setProgram] = useState('')
  const [cohort, setCohort] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [reminderDay, setReminderDay] = useState(0)
  const [reminderTime, setReminderTime] = useState('18:00')
  const [ack, setAck] = useState(false)

  // First placement
  const [ward, setWard] = useState('')
  const [hospital, setHospital] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    void getUniversities().then(setUniversities)
  }, [])

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [loading, user, router])

  // If a profile already exists, onboarding is done.
  useEffect(() => {
    if (!user) return
    void getProfile(user.id).then((p) => {
      if (p) router.replace('/reflections')
    })
  }, [user, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!ack) {
      setError('Please acknowledge the confidentiality note to continue.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await saveProfile({
        id: user.id,
        fullName: fullName.trim(),
        universityId: universityId || undefined,
        program: program.trim() || undefined,
        cohort: cohort.trim() || undefined,
        yearLevel: yearLevel ? Number(yearLevel) : undefined,
        nurseTrack: 'RN',
        reminderDay,
        reminderTime,
        taggingOn: true,
      })
      await createPlacement(user.id, {
        ward: ward.trim() || undefined,
        hospital: hospital.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      router.replace('/reflections')
    } catch {
      setError('Something went wrong saving your profile. It is saved on your device; try again.')
      setBusy(false)
    }
  }

  if (loading) return null

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome to Prac</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        A couple of details, then your first placement.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Card className="space-y-4">
          <h2 className="font-medium">About you</h2>
          <Field label="Full name" htmlFor="fullName">
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="University" htmlFor="university">
            <select
              id="university"
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Select…</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Program" htmlFor="program">
              <Input id="program" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. BN" />
            </Field>
            <Field label="Cohort" htmlFor="cohort">
              <Input id="cohort" value={cohort} onChange={(e) => setCohort(e.target.value)} placeholder="e.g. 2026" />
            </Field>
          </div>
          <Field label="Year level" htmlFor="yearLevel">
            <Input
              id="yearLevel"
              inputMode="numeric"
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value.replace(/\D/g, ''))}
              placeholder="1–4"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reminder day" htmlFor="reminderDay">
              <select
                id="reminderDay"
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
            <Field label="Reminder time" htmlFor="reminderTime">
              <Input id="reminderTime" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-medium">Your first placement</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Anything can be left blank and edited later.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ward" htmlFor="ward">
              <Input id="ward" value={ward} onChange={(e) => setWard(e.target.value)} />
            </Field>
            <Field label="Hospital" htmlFor="hospital">
              <Input id="hospital" value={hospital} onChange={(e) => setHospital(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" htmlFor="startDate">
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Expected end date" htmlFor="endDate">
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
        </Card>

        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span className="text-slate-600 dark:text-slate-300">
            I understand reflections are my professional record and I will not include
            patient-identifiable information.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Setting up…' : 'Start reflecting'}
        </Button>
      </form>
    </main>
  )
}
