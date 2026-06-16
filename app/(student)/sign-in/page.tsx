'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/auth/client'
import { Button, Field, Input } from '@/src/ui/components'

// Two sign-in methods:
//  - Password (email + password): the default. Doesn't touch Supabase's email
//    sender, so it sidesteps the free-tier one-time-code rate limits.
//  - Email one-time code (CLAUDE.md §1, spec §4.4): passwordless fallback.
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
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    router.replace('/reflections')
  }

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
    setMode('otp-code')
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
            {mode === 'password'
              ? 'Enter your email and password.'
              : mode === 'otp-email'
                ? 'Enter your email and we’ll send you a 6-digit code.'
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
                placeholder="you@university.edu.au"
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode('otp-email')
                setError(null)
              }}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              Email me a 6-digit code instead
            </button>
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
                placeholder="you@university.edu.au"
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Continue'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode('password')
                setError(null)
              }}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              Use a password instead
            </button>
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
              {busy ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode('otp-email')
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
