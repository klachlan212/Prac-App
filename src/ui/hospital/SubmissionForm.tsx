'use client'

import * as React from 'react'
import { Button, Field, Input, Label } from '@/src/ui/components'
import { CATEGORIES, type Hospital, type TipCategory, type Confidence } from '@/src/content/hospitals'
import { submitTip } from '@/src/data/hospitals'
import { todayISO } from '@/src/data/ids'

const MAX = 300
const REQUEST_NEW = '__request_new__'

export interface SubmissionFormProps {
  open: boolean
  onClose: () => void
  hospitals: Hospital[]
  defaultHospitalId: string
  defaultCategory?: TipCategory | null
}

// Universal submission form (one form, all categories). Validates on submit, then
// calls submit_hospital_tip (SECURITY DEFINER RPC) which queues the tip to the
// moderation table — nothing is public until a moderator approves it.
// NOTE: the "request a new hospital" branch has no capture mechanism yet, so its
// confirmation copy must not claim the request was recorded.
export function SubmissionForm({
  open,
  onClose,
  hospitals,
  defaultHospitalId,
  defaultCategory,
}: SubmissionFormProps) {
  const [hospitalId, setHospitalId] = React.useState(defaultHospitalId)
  const [requestName, setRequestName] = React.useState('')
  const [category, setCategory] = React.useState<TipCategory | ''>(defaultCategory ?? '')
  const [subCategory, setSubCategory] = React.useState('')
  const [text, setText] = React.useState('')
  const [confidence, setConfidence] = React.useState<Confidence | ''>('')
  const [verifiedOn, setVerifiedOn] = React.useState(todayISO())
  const [anonymous, setAnonymous] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const firstRef = React.useRef<HTMLSelectElement>(null)
  const meta = CATEGORIES.find((c) => c.id === category)

  // Re-seed defaults each time the modal is opened.
  React.useEffect(() => {
    if (!open) return
    setHospitalId(defaultHospitalId)
    setCategory(defaultCategory ?? '')
    setSubCategory('')
    setText('')
    setConfidence('')
    setVerifiedOn(todayISO())
    setAnonymous(false)
    setRequestName('')
    setError(null)
    setDone(false)
  }, [open, defaultHospitalId, defaultCategory])

  // Focus + Escape + body scroll lock while open.
  React.useEffect(() => {
    if (!open) return
    const t = setTimeout(() => firstRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (hospitalId === REQUEST_NEW && !requestName.trim()) {
      return setError('Tell us which hospital to add.')
    }
    if (hospitalId !== REQUEST_NEW && !hospitalId) return setError('Choose a hospital.')
    if (!category) return setError('Choose a category.')
    if (!text.trim()) return setError('Add your tip.')
    if (text.length > MAX) return setError(`Keep it under ${MAX} characters.`)
    if (!verifiedOn) return setError('Add the date you last confirmed this.')
    setError(null)

    // "Request a new hospital" has no tip to queue — just acknowledge it.
    if (hospitalId === REQUEST_NEW) {
      setDone(true)
      return
    }

    setSubmitting(true)
    try {
      await submitTip({
        hospitalId,
        category: category as TipCategory,
        text: text.trim(),
        subCategory: subCategory || null,
        confidence: confidence || null,
        verificationDate: verifiedOn,
        anonymous,
      })
      setDone(true)
    } catch {
      setError('Couldn’t submit just now — check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-card border border-line bg-surface p-5 shadow-float sm:rounded-card"
      >
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-new text-xl text-teal-deep">
              ✓
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Thanks.</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
              {hospitalId === REQUEST_NEW
                ? `Thanks for flagging ${requestName.trim()}. New-hospital requests aren’t automated yet — the quickest way to get it added is to let Lachlan know directly.`
                : 'Lachlan reviews every tip before it’s published, so it doesn’t appear straight away. That review is what keeps this directory trustworthy.'}
            </p>
            <div className="mt-5">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="flex items-start justify-between gap-3">
              <h2 id="submit-title" className="font-display text-xl font-semibold tracking-tight">
                Share a tip<span className="text-teal">.</span>
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-sage-50 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <Field label="Hospital">
              <select
                ref={firstRef}
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="min-h-[48px] w-full rounded-field border border-line bg-surface px-4 text-base text-ink shadow-card outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                <option value={REQUEST_NEW}>+ Request a new hospital…</option>
              </select>
            </Field>

            {hospitalId === REQUEST_NEW && (
              <Field label="Which hospital?" hint="We’ll add the most-requested ones first.">
                <Input
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="e.g. Northern Hospital, Epping"
                />
              </Field>
            )}

            <Field label="Category">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as TipCategory)
                  setSubCategory('')
                }}
                className="min-h-[48px] w-full rounded-field border border-line bg-surface px-4 text-base text-ink shadow-card outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
              >
                <option value="">Choose a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </Field>

            {meta?.subPrompts && (
              <Field label="What about?">
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="min-h-[48px] w-full rounded-field border border-line bg-surface px-4 text-base text-ink shadow-card outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
                >
                  <option value="">Pick one (optional)…</option>
                  {meta.subPrompts.map((s) => (
                    <option key={s.key} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="tip-text">Your tip</Label>
                <span
                  className={`font-mono text-xs ${text.length > MAX ? 'text-flag' : 'text-ink-faint'}`}
                >
                  {text.length}/{MAX}
                </span>
              </div>
              <textarea
                id="tip-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={MAX + 40}
                placeholder="Share what you know. Be specific, actionable, and honest."
                className="w-full rounded-card border border-line bg-surface p-3.5 text-sm leading-relaxed text-ink shadow-card outline-none transition placeholder:text-ink-faint focus:border-teal focus:ring-2 focus:ring-teal/30"
              />
              <p className="text-xs leading-relaxed text-ink-faint">
                Hospital-wide logistics only — no ward-specific tips, gossip, patient details or
                confidential operations.
              </p>
            </div>

            <Field label="How confident are you?" hint="Optional — helps us rank it.">
              <div className="flex gap-2">
                {(['High', 'Medium', 'Low'] as Confidence[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={confidence === c}
                    onClick={() => setConfidence(confidence === c ? '' : c)}
                    className={`min-h-[44px] flex-1 rounded-2xl border px-3 text-sm font-medium transition ${
                      confidence === c
                        ? 'border-teal bg-new text-teal-deep'
                        : 'border-line bg-surface text-ink-soft hover:border-sage-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Last confirmed" htmlFor="verified-on">
              <Input
                id="verified-on"
                type="date"
                value={verifiedOn}
                max={todayISO()}
                onChange={(e) => setVerifiedOn(e.target.value)}
              />
            </Field>

            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-5 w-5 rounded border-line text-teal focus:ring-teal"
              />
              Post anonymously
            </label>

            {error && (
              <p className="rounded-field border border-flag-line bg-flag-bg px-3 py-2 text-sm text-flag-ink">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sharing…' : 'Share this tip'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
