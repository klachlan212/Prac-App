'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/src/auth/client'
import { Button, Field, Input } from '@/src/ui/components'
import { SiteFooter } from '@/src/ui/SiteFooter'

// Two sign-in methods (CLAUDE.md §A7):
//  - Password (email + password): default; sidesteps the free-tier one-time-code
//    email rate limits during dev.
//  - Email one-time code: passwordless fallback. (Spec §2 wants magic-link as the
//    long-term default for the multi-year handoff — revisit before v1.)
type Mode = 'password' | 'otp-email' | 'otp-code'

function SignInForm() {
  const router = useRouter()
  const search = useSearchParams()
  const initialEmail = search.get('email') ?? ''
  // Everyone gets the passwordless email-code flow. Password is a discreet operator
  // fallback only, reached via /sign-in?staff (so we're never locked out if email
  // delivery fails). Students never see it.
  const isStaff = search.get('staff') !== null
  const [mode, setMode] = useState<Mode>(isStaff ? 'password' : 'otp-email')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (error) return setError(error.message)
    router.replace('/reflections')
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) return setError(error.message)
    setMode('otp-code')
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) return setError(error.message)
    router.replace('/reflections')
  }

  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-7">
        <div className="space-y-4 text-center">
          <div className="font-display text-3xl font-semibold tracking-tight">
            Prac<span className="text-teal">.</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-xs font-medium text-ink">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-teal-ink">
              RN
            </span>
            Built by a registered nurse
          </span>
        </div>

        <div className="space-y-1 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {mode === 'otp-code' ? 'Check your email' : mode === 'password' ? 'Staff sign-in' : 'Welcome'}
          </h1>
          <p className="text-sm text-ink-soft">
            {mode === 'password'
              ? 'Sign in with your password.'
              : mode === 'otp-email'
                ? 'Enter your email — we’ll send a sign-in code. New or returning, same way in.'
                : `Enter the code we sent to ${email}.`}
          </p>
        </div>

        {mode === 'password' && (
          <form onSubmit={signInWithPassword} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@student.edu.au"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && <p className="text-sm text-flag">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setMode('otp-email'); setError(null) }}>
              Email me a sign-in code instead
            </Button>
          </form>
        )}

        {mode === 'otp-email' && (
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
                placeholder="you@student.edu.au"
              />
            </Field>
            {error && <p className="text-sm text-flag">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Continue'}
            </Button>
            {isStaff && (
              <Button type="button" variant="ghost" onClick={() => { setMode('password'); setError(null) }}>
                Use a password instead
              </Button>
            )}
          </form>
        )}

        {mode === 'otp-code' && (
          <form onSubmit={verifyCode} className="space-y-4">
            <Field label="Sign-in code" htmlFor="code">
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={10}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.3em]"
                placeholder="••••••"
                autoFocus
              />
            </Field>
            {error && <p className="text-sm text-flag">{error}</p>}
            <Button type="submit" disabled={busy || code.length < 6}>
              {busy ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setMode('otp-email'); setCode(''); setError(null) }}>
              Use a different email
            </Button>
          </form>
        )}

          <p className="text-center text-xs leading-relaxed text-ink-faint">
            By continuing you agree to our{' '}
            <Link href="/terms" className="underline hover:text-ink">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
