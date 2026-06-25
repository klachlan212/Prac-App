import * as React from 'react'
import { House, NotebookPen, LayoutGrid, User } from 'lucide-react'

// Shared phone shell for the landing feature mockups. Faithful to the app chrome
// (same frame as LandingDemo). `nav` shows a decorative bottom tab bar for the
// signed-in app screens; omit it for the public (hospital / guide) screens.
export type NavKey = 'home' | 'reflect' | 'resources' | 'profile'

export function PhoneMock({ children, nav }: { children: React.ReactNode; nav?: NavKey }) {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[1.75rem] border border-line bg-paper p-3 shadow-float">
      <div className="flex min-h-[440px] flex-col rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="flex-1">{children}</div>
        {nav && <DecorativeNav active={nav} />}
      </div>
    </div>
  )
}

function DecorativeNav({ active }: { active: NavKey }) {
  const items = [
    { key: 'home', Icon: House },
    { key: 'reflect', Icon: NotebookPen },
    { key: 'resources', Icon: LayoutGrid },
    { key: 'profile', Icon: User },
  ] as const
  return (
    <div
      className="mt-3 flex select-none items-center justify-around border-t border-line pt-2.5 text-ink-faint"
      aria-hidden
    >
      {items.map(({ key, Icon }) => (
        <Icon key={key} className={`h-[18px] w-[18px] ${active === key ? 'text-teal-deep' : ''}`} />
      ))}
    </div>
  )
}
