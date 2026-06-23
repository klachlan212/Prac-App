'use client'

import { useState } from 'react'
import { Check, Plus, House, NotebookPen, LayoutGrid, User } from 'lucide-react'
import { Emoji } from '@/src/ui/Emoji'

// Interactive, no-auth preview of the core loop for the landing page. Visitors tap
// through Reflect → Skills → Saved to feel the product before signing up (a better
// "experience the features" surface than exposing the real, auth-gated app nav).
const STEPS = ['Reflect', 'Skills', 'Saved'] as const
type Step = (typeof STEPS)[number]

export function LandingDemo() {
  const [step, setStep] = useState<Step>('Reflect')

  return (
    <div className="mx-auto w-full max-w-[300px]">
      {/* Step switcher */}
      <div className="mb-3 flex gap-1 rounded-full border border-line bg-surface p-1 shadow-card">
        {STEPS.map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            aria-pressed={step === s}
            className={`flex-1 select-none rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              step === s ? 'bg-teal text-teal-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Phone */}
      <div className="rounded-[1.75rem] border border-line bg-paper p-3 shadow-float">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold">
              Prac<span className="text-teal">.</span>
            </span>
            <span className="select-none font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Preview
            </span>
          </div>

          <div className="mt-3 min-h-[168px]">
            {step === 'Reflect' && (
              <div>
                <span className="inline-flex select-none items-center gap-1.5 rounded-lg bg-sage-100 px-2 py-1 text-[11px] font-medium">
                  <Emoji name="stethoscope" className="h-3.5 w-3.5" /> A clinical skill
                </span>
                <p className="mt-2 font-display text-base font-semibold">
                  Your reflection<span className="text-teal">.</span>
                </p>
                <p className="mt-1.5 rounded-lg bg-sage-50 px-2.5 py-2 text-xs leading-snug text-ink-soft">
                  Repositioned a post-op patient and noticed early signs they were uncomfortable.
                  Flagged it to my RN and we adjusted the plan together.
                </p>
              </div>
            )}

            {step === 'Skills' && (
              <div>
                <p className="font-display text-base font-semibold">
                  What did you do<span className="text-teal">?</span>
                </p>
                <div className="mt-2.5 space-y-1.5">
                  <SkillRow name="Pressure injury prevention" />
                  <SkillRow name="Therapeutic communication" />
                </div>
                <p className="mt-2 select-none text-[11px] text-ink-faint">
                  New vs Renewed is set from your history.
                </p>
              </div>
            )}

            {step === 'Saved' && (
              <div className="flex flex-col items-center pt-1 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal text-teal-ink">
                  <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                </div>
                <p className="mt-2 font-display text-base font-semibold">
                  Saved<span className="text-teal">.</span>
                </p>
                <p className="mt-1 text-xs text-ink-soft">Mapped to your NMBA standards.</p>
                <div className="mt-2 flex select-none gap-1">
                  {[1, 2, 4, 6].map((n) => (
                    <span
                      key={n}
                      className="rounded bg-new px-1.5 py-0.5 font-mono text-[10px] text-teal-deep"
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-5">
                  <DemoStat n="1" label="reflection" />
                  <DemoStat n="2" label="skills" />
                  <DemoStat n="4/7" label="standards" />
                </div>
              </div>
            )}
          </div>

          {/* Decorative app nav (shows the structure; not interactive in the preview) */}
          <div
            className="mt-3 flex select-none items-center justify-around border-t border-line pt-2.5 text-ink-faint"
            aria-hidden
          >
            <House className={`h-[18px] w-[18px] ${step === 'Saved' ? 'text-teal-deep' : ''}`} />
            <NotebookPen className={`h-[18px] w-[18px] ${step !== 'Saved' ? 'text-teal-deep' : ''}`} />
            <LayoutGrid className="h-[18px] w-[18px]" />
            <User className="h-[18px] w-[18px]" />
          </div>
        </div>
      </div>

      <p className="mt-2 select-none text-center text-xs text-ink-faint">
        Tap through a shift. No sign-up needed.
      </p>
    </div>
  )
}

function SkillRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-1.5">
      <Plus className="h-3.5 w-3.5 shrink-0 text-teal-deep" aria-hidden />
      <span className="flex-1 text-xs font-medium">{name}</span>
      <span className="select-none rounded bg-new px-1.5 py-0.5 text-[10px] font-semibold text-teal-deep">
        New
      </span>
    </div>
  )
}

function DemoStat({ n, label }: { n: string; label: string }) {
  return (
    <div className="select-none">
      <div className="font-display text-lg font-semibold text-teal-deep">{n}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
    </div>
  )
}
