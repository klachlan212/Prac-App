import * as React from 'react'

// Prac. design-system primitives (CLAUDE.md §1 brand, §5 accessibility).
// Warm light palette, Fraunces for display / DM Sans for UI. Touch targets ≥44px,
// visible focus rings, semantic elements. Prop APIs are stable across the redesign.

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'ghost' | 'flag' | 'danger'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-[48px] w-full select-none items-center justify-center gap-2 rounded-2xl px-5 font-sans text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50'
  const variants = {
    primary: 'bg-teal text-teal-ink shadow-[0_6px_18px_rgba(78,205,196,.35)] hover:bg-teal-bright',
    secondary: 'bg-sage-100 text-ink hover:bg-sage-200',
    quiet: 'border border-line bg-surface text-ink hover:border-sage-300',
    ghost: 'bg-transparent text-teal-deep hover:text-ink',
    flag: 'bg-flag text-white hover:opacity-90',
    danger: 'bg-flag/0 border border-flag/40 text-flag hover:bg-flag/5',
  }
  return <button className={cn(base, variants[variant], className)} {...props} />
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface p-4 shadow-card', className)}
      {...props}
    />
  )
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-[48px] w-full rounded-field border border-line bg-surface px-4 text-base text-ink shadow-card outline-none transition placeholder:text-ink-faint focus:border-teal focus:ring-2 focus:ring-teal/30',
        className
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-semibold text-ink-soft', className)}
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
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-ink-faint">{hint}</p>}
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
        'inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition',
        active
          ? 'border-teal bg-new text-teal-deep'
          : 'border-line bg-surface text-ink-soft hover:border-sage-300',
        className
      )}
      {...props}
    />
  )
}
