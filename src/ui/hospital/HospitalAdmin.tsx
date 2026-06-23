'use client'

import * as React from 'react'
import { Button, Card, Field, Input } from '@/src/ui/components'
import { AUS_STATES, CATEGORIES, type Hospital, type ReferenceCard, type TipCategory } from '@/src/content/hospitals'
import {
  deleteRefCard,
  fetchHospitals,
  fetchRefCards,
  saveRefCard,
  upsertHospital,
  type HospitalInput,
  type RefCardInput,
} from '@/src/data/hospitals'

// Moderator-only management of the hospital roster and official reference cards.
// All writes are gated server-side by RLS (profiles.is_moderator); this UI is just
// the convenient surface. Rendered from /admin behind the same moderator check.

const BLANK: HospitalInput = { id: '', name: '', state: '', location: '', region: '', intro: '', curatedBy: '' }

// CMS-style slug from the hospital name so the founder never has to think about
// URL ids: "St Vincent's Hospital" → "st-vincents-hospital". Stays editable.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const selectClass =
  'min-h-[48px] w-full rounded-field border border-line bg-surface px-4 text-base text-ink shadow-card outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30'
const textareaClass =
  'w-full rounded-card border border-line bg-surface p-3.5 text-sm leading-relaxed text-ink shadow-card outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30'
const inlineBtn =
  'min-h-[40px] rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition hover:border-sage-300'
const inlineDanger =
  'min-h-[40px] rounded-xl border border-flag/40 bg-surface px-3 text-sm font-medium text-flag transition hover:bg-flag/5'

export function HospitalAdmin() {
  const [hospitals, setHospitals] = React.useState<Hospital[]>([])
  const [form, setForm] = React.useState<HospitalInput>(BLANK)
  const [editingExisting, setEditingExisting] = React.useState(false)
  const [slugEdited, setSlugEdited] = React.useState(false)
  const [cardsFor, setCardsFor] = React.useState<Hospital | null>(null)
  const [msg, setMsg] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const scrollToForm = () =>
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const load = React.useCallback(async () => {
    try {
      setHospitals(await fetchHospitals())
    } catch {
      /* ignore */
    }
  }, [])
  React.useEffect(() => {
    void load()
  }, [load])

  function editHospital(h: Hospital) {
    setForm({
      id: h.id,
      name: h.name,
      state: h.state,
      location: h.location,
      region: h.region,
      intro: h.intro,
      curatedBy: h.curatedBy,
    })
    setEditingExisting(true)
    setSlugEdited(true)
    setMsg(null)
    scrollToForm()
  }
  function newHospital() {
    setForm(BLANK)
    setEditingExisting(false)
    setSlugEdited(false)
    setMsg(null)
  }

  async function saveHospital(e: React.FormEvent) {
    e.preventDefault()
    const id = form.id.trim()
    if (!editingExisting && !/^[a-z0-9-]+$/.test(id)) {
      setMsg('Slug must be lowercase letters, numbers and hyphens.')
      return
    }
    if (!form.state) {
      setMsg('Pick a state.')
      return
    }
    if (!form.name.trim() || !form.location.trim() || !form.region.trim() || !form.intro.trim()) {
      setMsg('Fill in name, location, region and intro.')
      return
    }
    setBusy(true)
    try {
      await upsertHospital({ ...form, id })
      setMsg(editingExisting ? 'Hospital updated.' : 'Hospital added.')
      await load()
      if (!editingExisting) newHospital()
      scrollToForm()
    } catch (err) {
      setMsg('Could not save — ' + (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={rootRef}>
      <h2 className="mb-2 font-medium">Manage hospitals</h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Add a hospital or edit its details. Changes show in the directory straight away.
      </p>
      {msg && <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">{msg}</p>}

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">
            {editingExisting ? `Edit · ${form.name || form.id}` : 'Add a hospital'}
          </h3>
          {editingExisting && (
            <button type="button" onClick={newHospital} className={inlineBtn}>
              + New
            </button>
          )}
        </div>
        <form onSubmit={saveHospital} className="space-y-3" noValidate>
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                // Auto-derive the slug from the name until it's edited by hand,
                // so a new hospital never fails on a blank/invalid URL id.
                setForm((f) => ({
                  ...f,
                  name,
                  id: !editingExisting && !slugEdited ? slugify(name) : f.id,
                }))
              }}
              placeholder="Northern Hospital"
            />
          </Field>
          {!editingExisting && (
            <Field label="Slug (URL id)" hint="Auto-filled from the name, only change if you need to.">
              <Input
                value={form.id}
                onChange={(e) => {
                  setSlugEdited(true)
                  setForm({ ...form, id: e.target.value })
                }}
                placeholder="northern-hospital"
              />
            </Field>
          )}
          <Field label="State">
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value as typeof form.state })}
              className={selectClass}
            >
              <option value="">Select a state…</option>
              {AUS_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location" hint="Suburb shown on the card — e.g. Epping, VIC">
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Epping, VIC"
            />
          </Field>
          <Field
            label="City / town"
            hint="Groups the directory. Use the capital (e.g. Melbourne) for a metro hospital; anything else lands under “State Regional/Rural/Remote”."
          >
            <Input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="Melbourne"
            />
          </Field>
          <Field label="Intro" hint="One reassuring line shown at the top of the profile">
            <textarea
              value={form.intro}
              onChange={(e) => setForm({ ...form, intro: e.target.value })}
              rows={3}
              className={textareaClass}
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : editingExisting ? 'Save changes' : 'Add hospital'}
          </Button>
        </form>
      </Card>

      <div className="mt-4 space-y-2">
        {hospitals.map((h) => (
          <div key={h.id} className="space-y-2">
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{h.name}</div>
                <div className="text-xs text-slate-500">
                  {h.state} · {h.region} · {h.location}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => editHospital(h)} className={inlineBtn}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setCardsFor((c) => (c?.id === h.id ? null : h))}
                  className={inlineBtn}
                >
                  {cardsFor?.id === h.id ? 'Hide cards' : 'Cards'}
                </button>
              </div>
            </Card>
            {cardsFor?.id === h.id && <RefCardManager hospital={h} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function RefCardManager({ hospital }: { hospital: Hospital }) {
    const blankCard = (): RefCardInput => ({
      hospitalId: hospital.id,
      category: 'Transit',
      text: '',
      sourceUrl: '',
      sourceLabel: '',
    })
    const [cards, setCards] = React.useState<ReferenceCard[]>([])
    const [cForm, setCForm] = React.useState<RefCardInput>(blankCard())
    const [cMsg, setCMsg] = React.useState<string | null>(null)
    const [cBusy, setCBusy] = React.useState(false)

    const loadCards = React.useCallback(async () => {
      try {
        setCards(await fetchRefCards(hospital.id))
      } catch {
        /* ignore */
      }
    }, [hospital.id])
    React.useEffect(() => {
      void loadCards()
      setCForm(blankCard())
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hospital.id, loadCards])

    async function saveCard(e: React.FormEvent) {
      e.preventDefault()
      if (!cForm.text.trim() || !cForm.sourceUrl.trim() || !cForm.sourceLabel.trim()) {
        setCMsg('Fill in text, source URL and label.')
        return
      }
      setCBusy(true)
      try {
        await saveRefCard({ ...cForm, hospitalId: hospital.id })
        setCMsg('Saved.')
        setCForm({ ...blankCard(), category: cForm.category })
        await loadCards()
      } catch (err) {
        setCMsg('Could not save — ' + (err as Error).message)
      } finally {
        setCBusy(false)
      }
    }

    async function removeCard(id: string) {
      if (!window.confirm('Delete this reference card?')) return
      try {
        await deleteRefCard(id)
        await loadCards()
      } catch {
        /* ignore */
      }
    }

    return (
      <Card className="mt-4 space-y-3">
        <h3 className="font-medium">Reference cards · {hospital.name}</h3>
        {cMsg && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">{cMsg}</p>}

        <div className="space-y-2">
          {cards.length === 0 ? (
            <p className="text-sm text-slate-500">No reference cards yet.</p>
          ) : (
            cards.map((c) => (
              <div key={c.id} className="rounded-xl border border-line p-3">
                <div className="text-xs text-slate-500">
                  {c.category} · {c.sourceLabel}
                </div>
                <p className="mt-1 text-sm">{c.text}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCForm({
                        id: c.id,
                        hospitalId: hospital.id,
                        category: c.category,
                        text: c.text,
                        sourceUrl: c.sourceUrl,
                        sourceLabel: c.sourceLabel,
                      })
                    }
                    className={inlineBtn}
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => removeCard(c.id)} className={inlineDanger}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={saveCard} className="space-y-3 border-t border-line pt-3" noValidate>
          <h4 className="text-sm font-medium">{cForm.id ? 'Edit card' : 'Add a card'}</h4>
          <select
            value={cForm.category}
            onChange={(e) => setCForm({ ...cForm, category: e.target.value as TipCategory })}
            className={selectClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <Field label="Text">
            <textarea
              value={cForm.text}
              onChange={(e) => setCForm({ ...cForm, text: e.target.value })}
              rows={2}
              className={textareaClass}
            />
          </Field>
          <Field label="Source URL">
            <Input
              value={cForm.sourceUrl}
              onChange={(e) => setCForm({ ...cForm, sourceUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Source label">
            <Input
              value={cForm.sourceLabel}
              onChange={(e) => setCForm({ ...cForm, sourceLabel: e.target.value })}
              placeholder="thermh.org.au"
            />
          </Field>
          <Button type="submit" disabled={cBusy}>
            {cBusy ? 'Saving…' : cForm.id ? 'Save card' : 'Add card'}
          </Button>
          {cForm.id && (
            <button type="button" onClick={() => setCForm(blankCard())} className={inlineBtn}>
              Cancel edit
            </button>
          )}
        </form>
      </Card>
    )
}
