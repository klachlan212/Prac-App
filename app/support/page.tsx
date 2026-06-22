import type { Metadata } from 'next'
import { LegalPage, H2 } from '@/src/ui/LegalPage'
import { LEGAL } from '@/src/content/legal'

export const metadata: Metadata = {
  title: 'Help & contact · Prac.',
  description: 'How to get support with Prac.',
}

export default function SupportPage() {
  return (
    <LegalPage title="Help & contact">
      <p>
        Prac. is built and supported by {LEGAL.founder}, a registered nurse — so it is a small team
        (hi). The fastest way to reach a human is email.
      </p>

      <H2>Email</H2>
      <p className="mt-2">
        <a href={`mailto:${LEGAL.supportEmail}`} className="text-lg font-semibold text-teal-deep hover:text-ink">
          {LEGAL.supportEmail}
        </a>
        <br />
        We aim to reply within {LEGAL.responseTime}.
      </p>

      <H2>Reporting a bug</H2>
      <p className="mt-2">
        Tell us what device and browser you are on and what happened — the more specific, the
        faster we can fix it.
      </p>

      <H2>Privacy requests</H2>
      <p className="mt-2">
        For access, correction or deletion of your data, email us with &ldquo;Privacy&rdquo; in the
        subject. You can also delete your account and all content yourself from Settings at any
        time.
      </p>

      <p className="mt-6 text-ink-faint">
        Built by a registered nurse. Not affiliated with the NMBA or any university.
      </p>
    </LegalPage>
  )
}
