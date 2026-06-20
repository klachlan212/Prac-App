'use client'

import * as React from 'react'
import { fetchTipCount } from '@/src/data/hospitals'

// Small client badge for the directory list — fetches the live published-tip
// count so the roster can stay a server component.
export function TipCount({ hospitalId }: { hospitalId: string }) {
  const [count, setCount] = React.useState<number | null>(null)

  React.useEffect(() => {
    let active = true
    fetchTipCount(hospitalId)
      .then((c) => active && setCount(c))
      .catch(() => active && setCount(0))
    return () => {
      active = false
    }
  }, [hospitalId])

  if (count === null) {
    return (
      <span className="shrink-0 rounded-full bg-sage-50 px-2.5 py-1 text-[11px] font-medium text-ink-faint">
        …
      </span>
    )
  }
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        count > 0 ? 'bg-new text-teal-deep' : 'bg-sage-50 text-ink-soft'
      }`}
    >
      {count > 0 ? `${count} tips` : 'Launching'}
    </span>
  )
}
