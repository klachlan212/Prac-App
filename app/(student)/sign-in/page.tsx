'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/auth/client'
import { Button, Field, Input } from '@/src/ui/components'

// Email one-time code sign-in (CLAUDE.md §1, spec §4.4). No password is ever
// created. A 6-digit code survives mail link-rewriting; no magic-link round trip.
export default function SignInPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep('code')
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    // Onboarding gate lives on the next screen.
    router.replace('/reflections')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Prac</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {step === 'email'
              ? 'Enter your email and we’ll send you a 6-digit code.'
              : `Enter the code we sent to ${email}.`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={sendCode} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu.au"
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Continue'}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <Field label="6-digit code" htmlFor="code">
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.5em]"
                placeholder="••••••"
                autoFocus
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
              {busy ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
              }}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
