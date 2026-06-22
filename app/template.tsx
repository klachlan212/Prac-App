'use client'

// Page transition (CLAUDE.md A7). A `template.tsx` re-mounts on every navigation,
// so the fade/rise animation replays on each route change — a smooth, app-wide
// transition with no dependency. Honours prefers-reduced-motion via CSS.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
