import type { Metadata } from 'next'
import Link from 'next/link'
import { EmailCapture } from '@/src/ui/landing/EmailCapture'
import { SiteFooter } from '@/src/ui/SiteFooter'

export const metadata: Metadata = {
  title: 'Prac. — your placement, remembered',
  description:
    'A free reflective companion for Australian nursing students. Reflect after each shift, map it to your NMBA standards, and build the record your final-year self uses for grad applications — plus hospital and ward guides that take the edge off day one.',
}

const HERO_SUB =
  'Write your placement reflections in Prac., submit them to your uni’s assessment, and keep everything in one place. By final year, you’ve got a complete portfolio of skills and learning — ready for grad applications, post-grad studies or your own records.'

const GRAD_BODY =
  'Every reflection and skill you log compounds into a structured record across all your placements. When grad applications land in final year, you are not staring at a blank page trying to remember first year — it is already there, mapped to the standards, ready to export.'

const STRESS_BODY =
  'The night before a 6am start shouldn’t be spent dreading the unknown. Prac.’s hospital directory and ward guides cover the practical stuff — where to park, how to get in, what the ward actually feels like, and the skills you’ll likely meet — written by nurses who’ve been there.'

const STEPS: { n: string; h: string; b: string }[] = [
  { n: '1', h: 'Reflect', b: 'Three soft prompts. Two minutes, even at 9pm with bad signal — it autosaves as you go.' },
  { n: '2', h: 'It maps itself', b: 'Your reflection and the skills you log map to the relevant NMBA standards automatically.' },
  { n: '3', h: 'It’s yours', b: 'A growing record you can filter and export anytime — across your whole degree.' },
]

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      {/* ---------- Hero ---------- */}
      <div className="font-display text-2xl font-semibold tracking-tight">
        Prac<span className="text-teal">.</span>
      </div>

      <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-xs font-medium text-ink">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-teal-ink">
          RN
        </span>
        Built by a registered nurse
      </span>

      <h1 className="mt-5 font-display text-[32px] font-semibold leading-[1.1] tracking-tight">
        Your reflections stay with you<span className="text-teal">.</span>
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{HERO_SUB}</p>

      <div className="mt-6">
        <EmailCapture />
        <p className="mt-2 text-xs text-ink-faint">Free to start · No credit card · Leave anytime.</p>
      </div>

      {/* App-screen mock: the core loop */}
      <div className="mt-9">
        <PhoneFrame>
          <p className="font-display text-sm font-semibold">
            {'Your reflection'}
            <span className="text-teal">.</span>
          </p>
          <p className="mt-2 rounded-lg bg-sage-50 px-2.5 py-2 text-[11px] leading-snug text-ink-soft">
            One moment from today — what did you do or see?
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Chip>Wound care · New</Chip>
            <Chip>ISBAR handover · New</Chip>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">
              Maps to NMBA standards
            </span>
            <span className="ml-auto flex gap-1">
              {['1', '2', '4'].map((s) => (
                <span key={s} className="rounded bg-new px-1.5 py-0.5 font-mono text-[10px] text-teal-deep">
                  {s}
                </span>
              ))}
            </span>
          </div>
        </PhoneFrame>
      </div>

      {/* ---------- Pre-placement stress / guides (before reflections come into play) ---------- */}
      <section className="mt-14">
        <p className="font-mono text-[11px] uppercase tracking-wider text-teal-deep">Before day one</p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight">
          Walk in on day one less nervous<span className="text-teal">.</span>
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{STRESS_BODY}</p>

        <div className="mt-5 space-y-3">
          <div className="rounded-card border border-line bg-surface p-4 shadow-card">
            <p className="text-sm font-semibold">🏥 Royal Melbourne · getting in</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-soft">
              Cheapest parking is the Royal Park lot, ~8 min walk. Staff entrance off Grattan St
              opens at 6am.
            </p>
          </div>
          <div className="rounded-card border border-sage-200 bg-sage-50 p-4">
            <p className="font-display text-sm font-semibold">So you’ve got a med-surg placement.</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-soft">
              What the days feel like, the skills you’ll keep meeting, and the moments worth thinking
              twice about — from a nurse who’s been there.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-teal-deep">
          <Link href="/guides/med-surg" className="hover:text-ink">
            Peek at a ward guide →
          </Link>
          <Link href="/hospitals" className="hover:text-ink">
            Browse hospitals →
          </Link>
        </div>
        <p className="mt-2 text-xs text-ink-faint">No account needed to look around.</p>
      </section>

      {/* ---------- Grad applications payoff ---------- */}
      <section className="mt-14">
        <p className="font-mono text-[11px] uppercase tracking-wider text-teal-deep">The long game</p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight">
          {'Today’s two minutes — your final-year edge'}
          <span className="text-teal">.</span>
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{GRAD_BODY}</p>

        <div className="mt-5 rounded-card border border-line bg-surface p-4 shadow-card">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Your record</p>
          <div className="mt-3 flex items-end gap-6">
            <Stat n="38" label="reflections" />
            <Stat n="6/7" label="standards" />
            <Stat n="50+" label="skills" />
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-new px-2.5 py-1 text-xs font-semibold text-teal-deep">
            ⤓ Export for grad applications
          </div>
        </div>
      </section>

      {/* ---------- How it works (highlighted panel) ---------- */}
      <section className="mt-14 rounded-card border border-sage-200 bg-sage-50 p-6 shadow-card">
        <p className="font-mono text-[11px] uppercase tracking-wider text-teal-deep">How it works</p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight">
          Three steps, two minutes<span className="text-teal">.</span>
        </h2>
        <div className="mt-6 space-y-5">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal font-display text-base font-semibold text-teal-ink shadow-card">
                {s.n}
              </span>
              <div className="pt-1">
                <p className="text-[15px] font-semibold">{s.h}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{s.b}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="mt-14 rounded-card border-2 border-teal/50 bg-surface p-6 shadow-card">
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight">
          Start the portfolio you own<span className="text-teal">.</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Pop in your email — personal or uni — and you’re in. Your record starts with your next
          shift, and it’s yours to keep.
        </p>
        <div className="mt-4">
          <EmailCapture />
        </div>
        <p className="mt-2 text-xs text-ink-faint">Free to start · No credit card · Leave anytime.</p>
      </section>

      <SiteFooter />
    </main>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[1.75rem] border border-line bg-paper p-3 shadow-float">
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">{children}</div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-line bg-paper px-2 py-1 text-[11px] font-medium">
      {children}
    </span>
  )
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold text-teal-deep">{n}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
    </div>
  )
}
