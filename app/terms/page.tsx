import type { Metadata } from 'next'
import { LegalPage } from '@/src/ui/LegalPage'
import { LEGAL } from '@/src/content/legal'

export const metadata: Metadata = {
  title: 'Terms of Use · Prac.',
  description: 'The terms you agree to when you use Prac.',
}

const clauses: { h: string; body: string }[] = [
  {
    h: 'What Prac. is.',
    body: 'A free companion app to help Australian nursing students reflect on placement and build a personal record. It is free for the duration of your studies.',
  },
  { h: 'Eligibility.', body: `You are ${LEGAL.minAge}+ and a current or prospective nursing student.` },
  {
    h: 'Your account.',
    body: 'Keep your email access secure; you are responsible for activity under your account.',
  },
  {
    h: 'Your content is yours.',
    body: 'You own your reflections. You grant us only the limited permission needed to store, sync and display them back to you and to provide the service.',
  },
  {
    h: 'Not assessment evidence; not clinical advice.',
    body: 'Prac. is a private reflective tool. Your logs are not an official competency assessment, proof of practice, or evidence for the NMBA or your provider, and nothing in the app (including ward guides) is clinical instruction. Always follow your facility’s protocols and your facilitator or educator.',
  },
  {
    h: 'Confidentiality is your responsibility.',
    body: 'Do not enter patient-identifying information. Our identifier check is a best-effort aid, not a guarantee.',
  },
  {
    h: 'Acceptable use.',
    body: 'Do not submit unlawful, abusive, identifying or confidential content, and do not misuse the public hospital directory (submissions are moderated).',
  },
  {
    h: 'Availability.',
    body: 'The service is provided "as is". We aim for reliability but cannot guarantee uninterrupted or error-free operation, and we may change or discontinue features.',
  },
  {
    h: 'Liability.',
    body: 'To the extent permitted by law, we are not liable for indirect or consequential loss. Nothing in these terms excludes rights you have under the Australian Consumer Law.',
  },
  {
    h: 'Termination.',
    body: 'You can delete your account anytime. We may suspend accounts that breach these terms.',
  },
  { h: 'Governing law.', body: `${LEGAL.governingState}, Australia.` },
]

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated={LEGAL.lastUpdated}>
      <p>By using Prac. you agree to these terms.</p>
      <ol className="mt-4 space-y-4">
        {clauses.map((c, i) => (
          <li key={c.h}>
            <span className="font-semibold text-ink">
              {i + 1}. {c.h}
            </span>{' '}
            <span>{c.body}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6">
        Questions? Email{' '}
        <a href={`mailto:${LEGAL.supportEmail}`} className="font-semibold text-teal-deep hover:text-ink">
          {LEGAL.supportEmail}
        </a>
        .
      </p>
    </LegalPage>
  )
}
