'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/auth/client'
import { Button, Field, Input } from '@/src/ui/components'

// Two sign-in methods (CLAUDE.md §A7):
//  - Password (email + password): default; sidesteps the free-tier one-time-code
//    email rate limits during dev.
//  - Email one-time code: passwordless fallback. (Spec §2 wants magic-link as the
//    long-term default for the multi-year handoff — revisit before v1.)
type Mode = 'password' | 'otp-email' | 'otp-code'

export default function SignInPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
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
    <main className="flex min-h-screen items-center justify-center p-6">
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
            {mode === 'otp-code' ? 'Check your email' : 'Welcome back'}
          </h1>
          <p className="text-sm text-ink-soft">
            {mode === 'password'
              ? 'Sign in to your reflective record.'
              : mode === 'otp-email'
                ? 'We’ll email you a 6-digit code.'
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
              Email me a 6-digit code instead
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
            <Button type="button" variant="ghost" onClick={() => { setMode('password'); setError(null) }}>
              Use a password instead
            </Button>
          </form>
        )}

        {mode === 'otp-code' && (
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
            {error && <p className="text-sm text-flag">{error}</p>}
            <Button type="submit" disabled={busy || code.length < 6}>
              {busy ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setMode('otp-email'); setCode(''); setError(null) }}>
              Use a different email
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
