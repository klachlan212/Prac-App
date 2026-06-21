import { createClient } from '@/src/auth/client'
import { db } from '@/src/db/schema'
import type { LocalReflection, LocalPlacement, LocalProfile } from '@/src/db/schema'
import { getSkillLibrary } from '@/src/data/skills'

// The sync engine mirrors local-first writes to Postgres and pulls server
// state back. Single-author per user, so we use last-write-wins on updated_at
// and never silently drop a local write (CLAUDE.md §3).

let flushing = false

export async function flush(): Promise<void> {
  if (flushing) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return

  flushing = true
  try {
    const items = await db.syncQueue.orderBy('createdAt').toArray()
    for (const item of items) {
      try {
        if (item.entity === 'reflection') {
          await pushReflection(supabase, item.recordId)
        } else if (item.entity === 'placement') {
          await pushPlacement(supabase, item.recordId)
        } else if (item.entity === 'profile') {
          await pushProfile(supabase, item.recordId)
        }
        if (item.id !== undefined) await db.syncQueue.delete(item.id)
      } catch (err) {
        // Leave the item queued and stop; we'll retry on the next flush.
        // No content is ever logged — only a generic marker.
        console.warn('[sync] deferred an item; will retry')
        break
      }
    }
  } finally {
    flushing = false
  }
}

type SB = ReturnType<typeof createClient>

async function pushReflection(supabase: SB, id: string): Promise<void> {
  const r = (await db.reflections.get(id)) as LocalReflection | undefined
  if (!r) return

  const { error } = await supabase.from('reflections').upsert({
    id: r.id,
    placement_id: r.placementId,
    user_id: r.userId,
    body: r.body,
    what_happened: r.whatHappened ?? null,
    so_what: r.soWhat ?? null,
    now_what: r.nowWhat ?? null,
    status: r.status,
    reflected_on: r.reflectedOn,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt ?? null,
  })
  if (error) throw error

  // Replace the standard join rows for this reflection. Carry the item-level
  // code per standard (e.g. "4.2" → Standard 4) so the 23-item granularity is
  // preserved across sync and auditable, not just the standard ordinal.
  await supabase.from('reflection_standards').delete().eq('reflection_id', r.id)
  if (r.standardIds.length > 0) {
    const rows = r.standardIds.map((standard_id) => ({
      reflection_id: r.id,
      standard_id,
      item_code:
        (r.itemCodes ?? []).find((c) => Number.parseInt(c, 10) === standard_id) ?? null,
    }))
    const { error: sErr } = await supabase.from('reflection_standards').insert(rows)
    if (sErr) throw sErr
  }

  // Replace the derived tags for this reflection.
  await supabase.from('reflection_tags').delete().eq('reflection_id', r.id)
  if (r.tags.length > 0) {
    const rows = r.tags.map((t) => ({
      reflection_id: r.id,
      user_id: r.userId,
      label: t.label,
      kind: t.kind,
      source: t.source,
    }))
    const { error: tErr } = await supabase.from('reflection_tags').insert(rows)
    if (tErr) throw tErr
  }

  // Replace logged skills (reflection-scoped) for this reflection.
  await supabase.from('skills_logged').delete().eq('reflection_id', r.id)
  if (r.skills.length > 0) {
    const rows = r.skills.map((s) => ({
      id: s.id,
      user_id: r.userId,
      reflection_id: r.id,
      skill_id: s.skillId ?? null,
      raw_text: s.rawText ?? null,
      status: s.status,
      updated_at: r.updatedAt,
    }))
    const { error: kErr } = await supabase.from('skills_logged').insert(rows)
    if (kErr) throw kErr
  }

  // Replace identifier flags for this reflection (the "to review" state persists).
  await supabase.from('identifier_flags').delete().eq('reflection_id', r.id)
  if (r.identifierFlags.length > 0) {
    const rows = r.identifierFlags.map((f) => ({
      id: f.id,
      user_id: r.userId,
      reflection_id: r.id,
      label: f.label,
      kind: f.kind,
      status: f.status,
    }))
    const { error: fErr } = await supabase.from('identifier_flags').insert(rows)
    if (fErr) throw fErr
  }

  await db.reflections.update(id, { synced: 1 })
}

async function pushPlacement(supabase: SB, id: string): Promise<void> {
  const p = (await db.placements.get(id)) as LocalPlacement | undefined
  if (!p) return
  const { error } = await supabase.from('placements').upsert({
    id: p.id,
    user_id: p.userId,
    ward: p.ward ?? null,
    hospital: p.hospital ?? null,
    start_date: p.startDate ?? null,
    end_date: p.endDate ?? null,
    status: p.status,
    updated_at: p.updatedAt,
    deleted_at: p.deletedAt ?? null,
  })
  if (error) throw error
  await db.placements.update(id, { synced: 1 })
}

async function pushProfile(supabase: SB, id: string): Promise<void> {
  const p = (await db.profile.get(id)) as LocalProfile | undefined
  if (!p) return
  const { error } = await supabase.from('profiles').upsert({
    id: p.id,
    full_name: p.fullName,
    university_id: p.universityId ?? null,
    program: p.program ?? null,
    cohort: p.cohort ?? null,
    year_level: p.yearLevel ?? null,
    nurse_track: p.nurseTrack,
    reminder_day: p.reminderDay,
    reminder_time: p.reminderTime ?? null,
    tagging_on: p.taggingOn,
  })
  if (error) throw error
  await db.profile.update(id, { synced: 1 })
}

// Pull server state into Dexie, merging by updated_at (last-write-wins).
export async function pull(userId: string): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  const supabase = createClient()

  // Profile first — without it a returning user on a new device is bounced back
  // through onboarding (which duplicates their placement). LWW by synced state.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (profile) await mergeProfile(profile)

  const { data: placements } = await supabase
    .from('placements')
    .select('*')
    .eq('user_id', userId)
  for (const p of placements ?? []) {
    await mergePlacement(p)
  }

  const { data: reflections } = await supabase
    .from('reflections')
    .select(
      '*, reflection_standards(standard_id, item_code), reflection_tags(label, kind, source), skills_logged(id, skill_id, raw_text, status), identifier_flags(id, label, kind, status)'
    )
    .eq('user_id', userId)
  for (const r of reflections ?? []) {
    await mergeReflection(r)
  }
}

async function mergeProfile(p: any): Promise<void> {
  // Don't clobber unsynced local edits to the profile.
  const local = await db.profile.get(p.id)
  if (local && local.synced === 0) return
  await db.profile.put({
    id: p.id,
    fullName: p.full_name,
    universityId: p.university_id ?? undefined,
    program: p.program ?? undefined,
    cohort: p.cohort ?? undefined,
    yearLevel: p.year_level ?? undefined,
    nurseTrack: p.nurse_track,
    reminderDay: p.reminder_day,
    reminderTime: p.reminder_time ?? undefined,
    taggingOn: p.tagging_on,
    synced: 1,
  })
}

async function mergePlacement(p: any): Promise<void> {
  const local = await db.placements.get(p.id)
  if (local && local.updatedAt >= p.updated_at && local.synced === 1) return
  await db.placements.put({
    id: p.id,
    userId: p.user_id,
    ward: p.ward ?? undefined,
    hospital: p.hospital ?? undefined,
    startDate: p.start_date ?? undefined,
    endDate: p.end_date ?? undefined,
    status: p.status,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    deletedAt: p.deleted_at ?? undefined,
    synced: 1,
  })
}

async function mergeReflection(r: any): Promise<void> {
  const local = await db.reflections.get(r.id)
  if (local && local.updatedAt >= r.updated_at && local.synced === 1) return

  // Resolve skill names/standards from the (cached) library for display.
  const lib = await getSkillLibrary()
  const byId = new Map(lib.map((s) => [s.id, s]))

  await db.reflections.put({
    id: r.id,
    placementId: r.placement_id,
    userId: r.user_id,
    body: r.body ?? '',
    whatHappened: r.what_happened ?? undefined,
    soWhat: r.so_what ?? undefined,
    nowWhat: r.now_what ?? undefined,
    status: r.status ?? 'saved',
    reflectedOn: r.reflected_on,
    standardIds: (r.reflection_standards ?? []).map((s: any) => s.standard_id),
    itemCodes: (r.reflection_standards ?? [])
      .map((s: any) => s.item_code)
      .filter((c: any): c is string => !!c),
    tags: (r.reflection_tags ?? []).map((t: any) => ({
      label: t.label,
      kind: t.kind,
      source: t.source,
    })),
    skills: (r.skills_logged ?? []).map((k: any) => {
      const entry = k.skill_id ? byId.get(k.skill_id) : undefined
      return {
        id: k.id,
        skillId: k.skill_id ?? undefined,
        rawText: k.raw_text ?? undefined,
        name: entry?.name ?? k.raw_text ?? 'Skill',
        status: k.status,
        standardIds: entry?.standardIds ?? [],
        itemCodes: entry?.itemCodes ?? [],
      }
    }),
    identifierFlags: (r.identifier_flags ?? []).map((f: any) => ({
      id: f.id,
      label: f.label,
      kind: f.kind,
      status: f.status,
    })),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? undefined,
    synced: 1,
  })
}
