import Link from 'next/link'
import { SiteFooter } from './SiteFooter'

// Shared shell for the public legal/support pages — calm, readable, same ground
// as the ward guides. Content is passed as children (kept as data/strings in the
// pages so there's no JSX entity-escaping to trip over).
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated?: string
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
        Prac<span className="text-teal">.</span>
      </Link>
      <h1 className="mt-8 font-display text-3xl font-semibold leading-tight tracking-tight">
        {title}
      </h1>
      {updated && <p className="mt-2 text-sm text-ink-faint">Last updated: {updated}</p>}
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-soft">{children}</div>
      <SiteFooter />
    </main>
  )
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-display text-lg font-semibold text-ink">{children}</h2>
}
