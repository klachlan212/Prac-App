'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/src/ui/components'

// The landing's primary action: capture the email and carry it into /sign-in
// (prefilled there) so a student starts in one move. Kept deliberately simple —
// it hands off to the real auth screen rather than triggering auth here.
export function EmailCapture({ cta = 'Start free →' }: { cta?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')

  function go(e: React.FormEvent) {
    e.preventDefault()
    const v = email.trim()
    router.push(v ? `/sign-in?email=${encodeURIComponent(v)}` : '/sign-in')
  }

  return (
    <form onSubmit={go} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@student.edu.au"
        className="flex-1"
      />
      <Button type="submit" className="whitespace-nowrap sm:w-auto sm:px-6">
        {cta}
      </Button>
    </form>
  )
}
