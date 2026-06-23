import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGuide, GUIDES } from '@/src/content/guides'
import { BottomNav } from '@/src/ui/BottomNav'
import { Check, Plus, Pencil, LayoutGrid, Heart } from 'lucide-react'
import { SiteFooter } from '@/src/ui/SiteFooter'

// Public, ungated funnel page (spec §6) — outside the auth group on purpose so it
// catches search / shared links. Conversion sits AFTER the value, framed as
// reciprocity. No protocols or clinical instruction; texture + prompts only.

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) return { title: 'Guide not found · Prac.' }
  return { title: `${g.ward} placement · a nurse’s guide · Prac.`, description: g.intro }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) notFound()

  return (
    <main className="mx-auto max-w-xl px-5 py-10 pb-28">
      <div className="font-display text-2xl font-semibold tracking-tight">
        Prac<span className="text-teal">.</span>
      </div>

      <p className="mt-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-teal-deep">
        <Heart className="h-3.5 w-3.5 fill-current text-teal" aria-hidden />
        Ward guide · {g.ward} · {g.readMins} min read
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight">
        {g.title.replace(/\.$/, '')}
        <span className="text-teal">.</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{g.intro}</p>

      <div className="mt-6 flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-new font-display text-base font-semibold text-teal-deep">
          {g.byline.name.charAt(0)}
        </span>
        <span className="text-[13px] leading-snug">
          <b className="font-semibold">{g.byline.name}</b>
          <br />
          <span className="text-ink-faint">{g.byline.background}</span>
        </span>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold tracking-tight">What the days feel like</h2>
        <div className="mt-3 space-y-3">
          {g.feel.map((para, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-ink-soft">
              {para}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Skills you’ll probably touch
        </h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          You won’t do all of these, and you’ll do some a lot. Don’t aim to tick them off, just
          notice when they happen.
        </p>
        <div className="mt-3 space-y-2">
          {g.skills.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card"
            >
              <span className="flex-1 text-sm font-medium">{s.name}</span>
              <span className="rounded bg-new px-1.5 py-0.5 font-mono text-[10px] text-teal-deep">
                Std {s.standard}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold tracking-tight">Worth reflecting on</h2>
        <div className="mt-3 space-y-2">
          {g.prompts.map((p) => (
            <div
              key={p}
              className="rounded-card border border-[#e2d6ea] bg-plum-bg p-3.5 font-display text-[15px] italic leading-snug text-plum-ink"
            >
              “{p}”
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-faint">
        Written by a nurse who’s worked these wards. General guidance from experience, not
        clinical instruction. Always follow your facility’s protocols and your facilitator.
      </p>

      {/* Soft conversion — after the value, framed as reciprocity (spec §6). */}
      <section className="mt-10 rounded-card border border-line bg-surface p-5 shadow-card">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-new px-2.5 py-1 text-xs font-semibold text-teal-deep">
          <Check className="h-4 w-4" aria-hidden />
          You just read the whole guide, free
        </span>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
          Want it working <span className="italic">for</span> you on the ward
          <span className="text-teal">?</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Prac. is a free app that turns this from reading into your own record:
        </p>
        <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
          <li className="flex gap-2.5">
            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
            <span>
              Those skills, one tap to log as you do them, mapped to <b className="text-ink">your NMBA standards</b>
            </span>
          </li>
          <li className="flex gap-2.5">
            <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
            <span>Those prompts waiting for you at 9pm, in two minutes flat</span>
          </li>
          <li className="flex gap-2.5">
            <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
            <span>
              A reflective record that <b className="text-ink">builds across all your years</b>, not one ward
            </span>
          </li>
        </ul>
        <Link
          href="/sign-in"
          className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-teal px-5 font-semibold text-teal-ink shadow-[0_6px_18px_rgba(78,205,196,.35)] transition hover:bg-teal-bright"
        >
          Start using Prac. for free
        </Link>
        <p className="mt-3 text-center text-xs text-ink-faint">
          The guide stays free either way. No spam, leave any time.
        </p>
      </section>
      <SiteFooter />
      <BottomNav />
    </main>
  )
}
