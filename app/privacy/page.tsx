import type { Metadata } from 'next'
import { LegalPage, H2 } from '@/src/ui/LegalPage'
import { LEGAL } from '@/src/content/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy · Prac.',
  description: 'What Prac. collects, why, where it lives, and your choices.',
}

const intro = `Prac. ("Prac.", "we", "us") is built and run by ${LEGAL.founder}, a registered nurse in Australia. This policy explains, in plain language, what we collect, why, where it lives, and your choices. We've tried to write it the way we built the app — honestly.`

const sections: { h: string; body: string[] }[] = [
  {
    h: 'What we collect',
    body: [
      'Your email address — to create your account and send you sign-in links/codes and (if you opt in) reminders.',
      'A few profile details you tap in — year of study, nursing track, specialty/ward, and placement details (ward, hospital, dates).',
      'What you write — your reflections, the skills you log, and the NMBA standards they map to. This is your record.',
      'Technical basics — a login session stored on your device, and a random "device token" in your browser so the public hospital directory can dedupe anonymous tips and votes. We do not run third-party advertising or analytics trackers.',
    ],
  },
  {
    h: 'Where your data is stored',
    body: [
      'Your reflections and profile are saved on your device and synced to our database, hosted by Supabase in Sydney, Australia (AWS ap-southeast-2). The app is served by Vercel, and sign-in/reminder emails are sent via our email provider. These providers process data on our behalf under their own security and privacy terms.',
    ],
  },
  {
    h: 'An honest note on your reflections',
    body: [
      'Your reflection text is stored in our database so it is available across your devices and your whole degree. The app flags common identifiers (names, ages, bed/room numbers, dates) as you type and again before you export — but this check is not perfect, and we never claim your record is "safe" or "de-identified". Please keep patient-identifying details out of your reflections; what you write is your responsibility.',
    ],
  },
  {
    h: 'How we use it',
    body: [
      'To run the core features, sync across your devices, let you export your record, and — only if you opt in — send reminders. We do not sell your data, and we do not use your reflection content for advertising.',
    ],
  },
  {
    h: 'Who can see it',
    body: [
      'Only you. Our database enforces row-level security, so each account can only ever read its own rows. Aggregate, no-content features (like reminders) never read your reflection text. We access data only where strictly necessary to operate or support the service.',
    ],
  },
  {
    h: 'Your choices and rights',
    body: [
      'You can view and edit everything in the app, export your full record at any time, and delete your account and all content permanently from Settings. Under the Australian Privacy Principles you may also request access to or correction of your information — just email us.',
    ],
  },
  {
    h: 'Retention',
    body: [
      'We keep your data until you delete your account, after which it is removed from our database (backups roll off within 30 days).',
    ],
  },
  {
    h: 'Children',
    body: [`Prac. is intended for nursing students aged ${LEGAL.minAge} and over.`],
  },
  {
    h: 'Changes',
    body: [
      'We will update this page and change the date above; significant changes will be flagged in-app.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL.lastUpdated}>
      <p>{intro}</p>
      {sections.map((s) => (
        <section key={s.h}>
          <H2>{s.h}</H2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-2">
              {p}
            </p>
          ))}
        </section>
      ))}
      <section>
        <H2>Contact</H2>
        <p className="mt-2">
          Email us at{' '}
          <a href={`mailto:${LEGAL.supportEmail}`} className="font-semibold text-teal-deep hover:text-ink">
            {LEGAL.supportEmail}
          </a>
          . If you have a privacy concern we cannot resolve, you can contact the Office of the
          Australian Information Commissioner (oaic.gov.au).
        </p>
      </section>
    </LegalPage>
  )
}
