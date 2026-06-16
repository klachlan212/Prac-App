import * as React from 'react'

// Minimal design-system primitives. Accessibility is a requirement: 44px min
// touch targets, visible focus, semantic elements (CLAUDE.md §5).

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-base font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-sky-600 text-white hover:bg-sky-500 focus-visible:ring-sky-500',
    secondary:
      'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700 focus-visible:ring-slate-400',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500',
  }
  return <button className={cn(base, variants[variant], className)} {...props} />
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
        className
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300', className)}
      {...props}
    />
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[36px] items-center rounded-full border px-3 py-1 text-sm transition',
        active
          ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-300'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
        className
      )}
      {...props}
    />
  )
}
