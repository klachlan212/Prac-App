import Link from 'next/link'
import { LEGAL } from '@/src/content/legal'

// Quiet footer for public-facing pages: legal/support links + RN credibility +
// the not-affiliated line. Plain component (no client hooks) so it works inside
// both server and client pages.
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line pt-6 text-center text-xs leading-relaxed text-ink-faint">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-ink">
          Terms
        </Link>
        <Link href="/support" className="hover:text-ink">
          Support
        </Link>
      </nav>
      <p className="mt-3">
        Built by a registered nurse · © {new Date().getFullYear()} {LEGAL.appName}
      </p>
      <p className="mt-1">Not affiliated with the NMBA or any university.</p>
    </footer>
  )
}
