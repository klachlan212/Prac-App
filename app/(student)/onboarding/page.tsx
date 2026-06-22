'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/src/auth/useUser'
import { saveProfile, getProfile } from '@/src/data/profile'
import { createPlacement } from '@/src/data/placements'
import { PLACEMENT_CONTEXTS, CONTEXT_TO_GUIDE } from '@/src/content/contexts'
import { Check, ChevronRight } from 'lucide-react'
import { Button, Card, Input } from '@/src/ui/components'

// First-run setup (spec §2). Tap-select only — the one text field (email) was
// captured at sign-in. Goal: a reachable identity → one saved artifact, least
// friction. Email-first sequencing + magic-link (spec §2/§7) is a flagged open
// question handled with the auth flow, not here.

type Step = 'welcome' | 'name' | 'context' | 'year' | 'specialty' | 'ack' | 'success'
type Context = 'placement' | 'upcoming' | 'exploring'

const YEARS: Array<{ label: string; level?: number }> = [
  { label: '1st year', level: 1 },
  { label: '2nd year', level: 2 },
  { label: '3rd year', level: 3 },
  { label: 'Final year', level: 4 },
  { label: 'Postgrad / accelerated' },
]
const SPECIALTIES = [...PLACEMENT_CONTEXTS, 'Not sure yet']
const PROGRESS: Record<Step, number> = {
  welcome: 8,
  name: 20,
  context: 34,
  year: 52,
  specialty: 70,
  ack: 88,
  success: 100,
}

function deriveName(email?: string | null): string {
  if (!email) return 'Student'
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Student'
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useUser()

  const [step, setStep] = useState<Step>('welcome')
  const [context, setContext] = useState<Context | null>(null)
  const [year, setYear] = useState<(typeof YEARS)[number] | null>(null)
  const [specialty, setSpecialty] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Prefill the name field from the email local-part — a sensible default the
  // student can accept or overwrite (keeps the step near-zero friction).
  useEffect(() => {
    if (user?.email) setName((n) => n || deriveName(user.email))
  }, [user])

  async function finishSetup() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await saveProfile({
        id: user.id,
        fullName: name.trim() || deriveName(user.email),
        nurseTrack: 'RN',
        yearLevel: year?.level,
        reminderDay: 0,
        taggingOn: true,
      })
      const placementContext =
        specialty && specialty !== 'Not sure yet' ? specialty : undefined
      // "Just looking around" is an orientation path — don't create a placeholder
      // placement (it would be an empty, misleading record). One is created lazily
      // if/when they actually log a shift.
      if (context !== 'exploring') {
        await createPlacement(user.id, { context: placementContext })
      }

      setStep('success')
    } catch {
      setError('Something went wrong. Your details are saved on your device — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user) return null

  const guideSlug = specialty ? CONTEXT_TO_GUIDE[specialty] : undefined

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
      <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-sage-200">
        <div
          className="h-full rounded-full bg-teal transition-[width] duration-500"
          style={{ width: `${PROGRESS[step]}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col">
        {step === 'welcome' && (
          <div className="flex flex-1 flex-col">
            <div className="font-display text-3xl font-semibold tracking-tight">
              Prac<span className="text-teal">.</span>
            </div>
            <div className="mt-auto" />
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-xs font-medium">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-teal-ink">
                RN
              </span>
              Built by a registered nurse
            </span>
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
              Your placement, remembered — every shift, every year<span className="text-teal">.</span>
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              Write a short reflection, log the skills it surfaced, and Prac. maps it to your NMBA
              standards into a record you own. Free for your whole degree.
            </p>
            <div className="mt-8">
              <Button onClick={() => setStep('name')}>Get started</Button>
            </div>
          </div>
        )}

        {step === 'name' && (
          <Stepper
            eyebrow="First things first"
            title="What should we call you?"
            lede="Just for your record — and the grad documents it builds toward. Your real name works best."
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              maxLength={80}
              autoComplete="name"
            />
            <div className="mt-auto pt-8">
              <Button disabled={!name.trim()} onClick={() => setStep('context')}>
                Continue
              </Button>
            </div>
          </Stepper>
        )}

        {step === 'context' && (
          <Stepper
            eyebrow="So we start in the right place"
            title="Where are you right now?"
            lede="No wrong answer — this just sets up your first screen."
          >
            <div className="space-y-3">
              <Choice
                emoji="🏥"
                title="On placement now"
                sub="Let’s log your first shift"
                onClick={() => {
                  setContext('placement')
                  setStep('year')
                }}
              />
              <Choice
                emoji="📅"
                title="Placement this semester"
                sub="Get set up before day one"
                onClick={() => {
                  setContext('upcoming')
                  setStep('year')
                }}
              />
              <Choice
                emoji="🧭"
                title="Just looking around"
                sub="Explore what Prac. does"
                onClick={() => {
                  setContext('exploring')
                  setStep('year')
                }}
              />
            </div>
          </Stepper>
        )}

        {step === 'year' && (
          <Stepper
            eyebrow="Quick setup · 1 of 2"
            title="What year are you in?"
            lede="So your reflections map to the right NMBA standards."
          >
            <div className="flex flex-wrap gap-2.5">
              {YEARS.map((y) => (
                <TapChip key={y.label} active={year?.label === y.label} onClick={() => setYear(y)}>
                  {y.label}
                </TapChip>
              ))}
            </div>
            <div className="mt-auto pt-8">
              <Button disabled={!year} onClick={() => setStep('specialty')}>
                Continue
              </Button>
            </div>
          </Stepper>
        )}

        {step === 'specialty' && (
          <Stepper
            eyebrow="Quick setup · 2 of 2"
            title={
              context === 'placement'
                ? 'Which ward are you on?'
                : context === 'exploring'
                  ? 'Which ward are you curious about?'
                  : 'Which placement is coming up?'
            }
            lede="Pick the closest — you can change it any time."
          >
            <div className="flex flex-wrap gap-2.5">
              {SPECIALTIES.map((s) => (
                <TapChip key={s} active={specialty === s} onClick={() => setSpecialty(s)}>
                  {s}
                </TapChip>
              ))}
            </div>
            <div className="mt-auto pt-8">
              <Button disabled={!specialty} onClick={() => setStep('ack')}>
                Continue
              </Button>
            </div>
          </Stepper>
        )}

        {step === 'ack' && (
          <Stepper
            eyebrow="One thing before you start"
            title="Your record, kept confidential."
            lede="Reflections are your professional record — not assessment evidence. Keep patient-identifiable details out; Prac. flags common ones, but the rest is on you."
          >
            <div className="mt-auto space-y-3 pt-6">
              {error && <p className="text-sm text-flag">{error}</p>}
              <Button onClick={finishSetup} disabled={busy}>
                {busy ? 'Setting up…' : 'I understand — set me up'}
              </Button>
            </div>
          </Stepper>
        )}

        {step === 'success' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal text-teal-ink shadow-[0_12px_36px_rgba(78,205,196,.4)]">
              <Check className="h-10 w-10" strokeWidth={2.5} aria-hidden />
            </div>
            <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
              {context === 'exploring' ? 'You’re in' : 'You’re set up'}
              <span className="text-teal">.</span>
            </h1>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-ink-soft">
              {context === 'placement'
                ? 'Your placement’s ready. Let’s capture your first shift.'
                : context === 'upcoming'
                  ? 'Your placement’s saved and ready when you are.'
                  : 'Have a look around — nothing to fill in yet. Here’s where everything lives.'}
            </p>

            {context === 'exploring' ? (
              <>
                <div className="mt-6 w-full space-y-2.5 text-left">
                  <Signpost emoji="📝" title="Reflect" sub="After a shift — about two minutes." />
                  <Signpost emoji="📚" title="Resources" sub="Hospital guides and ward tips, free." />
                  <Signpost
                    emoji="🌱"
                    title="Your record"
                    sub="What you log builds toward grad applications."
                  />
                </div>
                {guideSlug && (
                  <button
                    onClick={() => router.push(`/guides/${guideSlug}`)}
                    className="mt-4 flex w-full items-center gap-3 rounded-card border border-sage-200 bg-sage-50 p-4 text-left shadow-card transition hover:border-sage-300"
                  >
                    <span aria-hidden>🏥</span>
                    <span className="flex-1 text-sm font-medium">
                      Start with the {specialty} ward guide
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
                  </button>
                )}
                <div className="mt-8 w-full">
                  <Button onClick={() => router.replace('/reflections')}>
                    Explore Prac<span aria-hidden>.</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Card className="mt-6 flex items-start gap-3 border-sage-200 bg-sage-50 text-left">
                  <span aria-hidden>🌱</span>
                  <span className="text-sm leading-relaxed text-ink-soft">
                    Everything you log now quietly builds the record your final-year self uses for grad
                    applications.
                  </span>
                </Card>
                <div className="mt-8 w-full">
                  {context === 'placement' ? (
                    <Button onClick={() => router.replace('/reflections/new')}>
                      Write your first reflection<span aria-hidden>.</span>
                    </Button>
                  ) : (
                    <Button onClick={() => router.replace('/reflections')}>
                      Go to your reflections
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function Stepper({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string
  title: string
  lede: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-deep">
        <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
        {eyebrow}
      </p>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{lede}</p>
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
    </div>
  )
}

function Signpost({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-sage-200 bg-surface p-3.5 shadow-card">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-100 text-lg"
        aria-hidden
      >
        {emoji}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[13px] text-ink-soft">{sub}</span>
      </span>
    </div>
  )
}

function Choice({
  emoji,
  title,
  sub,
  onClick,
}: {
  emoji: string
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-card border border-sage-200 bg-surface p-4 text-left shadow-card transition hover:-translate-y-px hover:border-sage-300"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sage-100 text-xl" aria-hidden>
        {emoji}
      </span>
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px] text-ink-soft">{sub}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-sage-300" aria-hidden />
    </button>
  )
}

function TapChip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] rounded-2xl border px-4 text-[15px] font-medium shadow-card transition ${
        active
          ? 'border-teal bg-teal text-teal-ink'
          : 'border-sage-200 bg-surface text-ink hover:border-sage-300'
      }`}
    >
      {children}
    </button>
  )
}
