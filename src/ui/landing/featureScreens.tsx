import * as React from 'react'
import {
  Check,
  Download,
  Flag,
  Heart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Emoji } from '@/src/ui/Emoji'
import { PhoneMock } from './PhoneMock'

// Faithful, static phone-frame mockups of the key features for the landing page.
// Live HTML (not screenshots) so they track the real UI. No hooks/data → server-safe.

// ── shared bits ──────────────────────────────────────────────────────────────
function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`select-none rounded-2xl border px-2.5 py-1.5 text-[11px] font-medium ${
        active ? 'border-teal bg-teal text-teal-ink' : 'border-sage-200 bg-surface text-ink-soft'
      }`}
    >
      {children}
    </span>
  )
}

function FauxField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold text-ink-soft">{label}</p>
      <div className="rounded-field border border-line bg-surface px-3 py-2 text-xs text-ink shadow-card">
        {value}
      </div>
    </div>
  )
}

function FakeButton({
  children,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode
  variant?: 'primary' | 'quiet'
  className?: string
}) {
  return (
    <span
      className={`inline-flex min-h-[40px] select-none items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold ${
        variant === 'primary'
          ? 'bg-teal text-teal-ink shadow-[0_6px_18px_rgba(78,205,196,.35)]'
          : 'border border-line bg-surface text-ink'
      } ${className}`}
    >
      {children}
    </span>
  )
}

function SkillChip({ name }: { name: string }) {
  return (
    <span className="inline-flex select-none items-center gap-1.5 rounded-lg border border-line bg-paper px-2 py-1 text-[11px] font-medium">
      {name}
      <span className="rounded bg-new px-1 py-0.5 text-[9px] font-semibold text-teal-deep">New</span>
    </span>
  )
}

function StdRow({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-teal bg-new px-2 py-1.5">
      <span className="w-3.5 font-mono text-[11px] font-semibold text-teal-deep">{n}</span>
      <span className="flex-1 text-[11px] font-semibold leading-tight">{title}</span>
      <span className="flex h-4 w-4 items-center justify-center rounded bg-teal text-teal-ink">
        <Check className="h-3 w-3" aria-hidden />
      </span>
    </div>
  )
}

// ── 1. Home "Today" ──────────────────────────────────────────────────────────
export function HomeScreen() {
  return (
    <PhoneMock nav="home">
      <div className="flex items-start justify-between">
        <h3 className="font-display text-xl font-semibold tracking-tight">
          Today<span className="text-teal">.</span>
        </h3>
        <span className="select-none text-right font-mono text-[10px] text-ink-faint">
          <span className="block font-semibold text-teal-deep">
            <Emoji name="fire" className="mr-0.5 inline-block h-3 w-3 align-text-bottom" />
            3-week streak
          </span>
          <span className="block">12 · 5/7 std</span>
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-card border border-line bg-surface p-3 shadow-card">
        <Emoji name="pushpin" className="h-5 w-5" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">6A · Royal Melbourne</span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            12 Jun to 11 Jul · <span className="font-semibold text-teal-deep">9 days left</span>
          </span>
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <FakeButton className="flex-1">Start a reflection.</FakeButton>
        <FakeButton variant="quiet">Log a skill</FakeButton>
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-card border border-teal/40 p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-new">
          <Emoji name="hospital" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <b className="text-xs font-semibold">Hospital tips</b>
            <span className="select-none rounded-full bg-teal px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-ink">
              New
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] text-ink-soft">Parking, access &amp; culture.</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-sage-300" aria-hidden />
      </div>
    </PhoneMock>
  )
}

// ── 2. Placement setup ─────────────────────────────────────────────────────
export function PlacementScreen() {
  return (
    <PhoneMock nav="home">
      <h3 className="font-display text-xl font-semibold tracking-tight">
        Your placement<span className="text-teal">.</span>
      </h3>
      <p className="mt-2 text-xs font-medium">Placement type</p>
      <p className="mt-0.5 text-[11px] text-ink-soft">Tailors which skills you see.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill active>Medical/Surgical</Pill>
        <Pill>Emergency</Pill>
        <Pill>Aged Care</Pill>
        <Pill>Mental Health</Pill>
        <Pill>Paediatric</Pill>
      </div>
      <div className="mt-3 space-y-2">
        <FauxField label="Ward / unit" value="6A" />
        <FauxField label="Hospital" value="Royal Melbourne" />
        <div className="grid grid-cols-2 gap-2">
          <FauxField label="Start" value="12 Jun" />
          <FauxField label="End" value="11 Jul" />
        </div>
      </div>
      <FakeButton className="mt-3 w-full">Save</FakeButton>
    </PhoneMock>
  )
}

// ── 3. Reflections + auto NMBA mapping ───────────────────────────────────────
export function ReflectScreen() {
  return (
    <PhoneMock nav="reflect">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage-100">
          <Emoji name="stethoscope" className="h-4 w-4" />
        </span>
        <h3 className="font-display text-lg font-semibold tracking-tight">
          Review &amp; save<span className="text-teal">.</span>
        </h3>
      </div>

      <div className="mt-3 rounded-card border border-line p-2.5">
        <p className="select-none font-mono text-[9px] uppercase tracking-wider text-ink-faint">
          Reflection
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
          Repositioned a post-op patient and spotted early discomfort; flagged it to my RN and we
          adjusted the plan.
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <SkillChip name="Pressure injury prevention" />
        <SkillChip name="Therapeutic communication" />
      </div>

      <div className="mt-2 rounded-card border border-line p-2.5">
        <p className="flex select-none items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint">
          Maps to NMBA standards
          <span className="rounded bg-new px-1 py-0.5 text-[8px] text-teal-deep">auto-suggested</span>
        </p>
        <div className="mt-2 space-y-1">
          <StdRow n={1} title="Thinks critically" />
          <StdRow n={2} title="Therapeutic relationships" />
          <StdRow n={4} title="Conducts assessments" />
          <StdRow n={6} title="Provides safe care" />
        </div>
      </div>
    </PhoneMock>
  )
}

// ── 4. Export / portfolio ────────────────────────────────────────────────────
export function ExportScreen() {
  return (
    <PhoneMock nav="profile">
      <div className="flex flex-col items-center pt-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal text-teal-ink">
          <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden />
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
          Record ready<span className="text-teal">.</span>
        </h3>
        <p className="mt-1 text-xs text-ink-soft">12 reflections.</p>

        <div className="mt-3 flex w-full items-start gap-2 rounded-card border border-flag-line bg-flag-bg p-2.5 text-left text-[11px] leading-snug text-flag-ink">
          <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Checked for common identifiers. Anything we missed is yours to catch before you send
            this to anyone.
          </span>
        </div>

        <div className="mt-3 w-full space-y-2">
          <FakeButton className="w-full">
            <Download className="h-4 w-4" aria-hidden />
            Save as PDF
          </FakeButton>
          <FakeButton variant="quiet" className="w-full">
            Save as text
          </FakeButton>
        </div>
      </div>
    </PhoneMock>
  )
}

// ── 5. Hospital directory ────────────────────────────────────────────────────
export function HospitalScreen() {
  return (
    <PhoneMock>
      <p className="select-none font-mono text-[10px] uppercase tracking-wider text-teal-deep">
        Hospital directory · VIC
      </p>
      <h3 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight">
        The Royal Melbourne Hospital
      </h3>
      <p className="text-[11px] text-ink-faint">Parkville, VIC</p>

      <div className="mt-2 flex items-center gap-2 rounded-card border border-line p-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-new text-teal-deep">
          <Check className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-[11px]">
          <b className="font-semibold">Curated by Lachlan</b> · 12 tips
        </span>
      </div>

      <div className="mt-2 rounded-card border border-line">
        <div className="flex items-center gap-2 p-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-new">
            <Emoji name="automobile" className="h-4 w-4" />
          </span>
          <span className="flex-1 text-xs font-semibold">Official transit &amp; parking</span>
          <ChevronDown className="h-4 w-4 text-ink-faint" aria-hidden />
        </div>
        <div className="border-t border-line-soft p-2.5">
          <div className="flex gap-2">
            <div className="flex select-none flex-col items-center text-ink-faint">
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[11px] font-semibold text-teal-deep">24</span>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div>
              <p className="text-xs leading-snug text-ink">
                Cheapest deck is Royal Park, about 8 min walk. Staff entrance off Grattan St opens
                6am.
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-teal-deep">
                <Check className="h-3 w-3" aria-hidden />
                Verified by RMH placement office
              </p>
            </div>
          </div>
        </div>
      </div>
    </PhoneMock>
  )
}

// ── 6. Ward guides ───────────────────────────────────────────────────────────
export function GuideScreen() {
  return (
    <PhoneMock>
      <p className="flex select-none items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-teal-deep">
        <Heart className="h-3 w-3 fill-current" aria-hidden />
        Ward guide · Med-surg
      </p>

      <div className="mt-2 flex items-center gap-2 rounded-card border border-line p-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-new font-display text-sm font-semibold text-teal-deep">
          K
        </span>
        <span className="text-[11px] leading-tight">
          <b className="font-semibold">Written by a registered nurse</b>
          <span className="mt-0.5 block text-ink-faint">Acute &amp; med-surg background</span>
        </span>
      </div>

      <p className="mt-2 text-xs leading-snug text-ink-soft">
        The pace is relentless but rhythmic: a med round, then obs, then a call bell. You&rsquo;ll
        feel behind the first week. Everyone does.
      </p>

      <div className="mt-2 flex items-center gap-2 rounded-card border border-line p-2.5">
        <span className="flex-1 text-xs font-medium">Basic wound care &amp; dressings</span>
        <span className="select-none rounded bg-new px-1.5 py-0.5 font-mono text-[10px] text-teal-deep">
          Std 4
        </span>
      </div>

      <div className="mt-2 rounded-card border border-[#e2d6ea] bg-plum-bg p-2.5">
        <p className="text-[11px] italic leading-snug text-plum-ink">
          The first time you sensed a patient was deteriorating before the obs confirmed it.
        </p>
      </div>
    </PhoneMock>
  )
}
