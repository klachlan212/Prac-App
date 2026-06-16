import { db } from '@/src/db/schema'
import type { LocalReflection } from '@/src/db/schema'
import type { Reflection, ReflectionTag } from './types'
import { newId, nowISO, todayISO } from './ids'
import { enqueue } from '@/src/sync/queue'
import { flush } from '@/src/sync/engine'

// All reflection reads/writes go through Dexie first (local-first), then
// enqueue a sync op. Writing never waits on the network (CLAUDE.md §3).

export interface DraftReflection {
  id?: string
  placementId: string
  userId: string
  body: string
  reflectedOn?: string
  standardIds?: number[]
  tags?: ReflectionTag[]
}

export async function saveReflection(draft: DraftReflection): Promise<string> {
  const now = nowISO()
  const existing = draft.id ? await db.reflections.get(draft.id) : undefined

  const record: LocalReflection = {
    id: draft.id ?? newId(),
    placementId: draft.placementId,
    userId: draft.userId,
    body: draft.body,
    reflectedOn: draft.reflectedOn ?? existing?.reflectedOn ?? todayISO(),
    standardIds: draft.standardIds ?? existing?.standardIds ?? [],
    tags: draft.tags ?? existing?.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: existing?.deletedAt,
    synced: 0,
  }

  await db.reflections.put(record)
  await enqueue('reflection', record.id, 'upsert')
  void flush()
  return record.id
}

export async function softDeleteReflection(id: string): Promise<void> {
  const now = nowISO()
  await db.reflections.update(id, { deletedAt: now, updatedAt: now, synced: 0 })
  await enqueue('reflection', id, 'upsert')
  void flush()
}

export async function restoreReflection(id: string): Promise<void> {
  const now = nowISO()
  await db.reflections.update(id, { deletedAt: undefined, updatedAt: now, synced: 0 })
  await enqueue('reflection', id, 'upsert')
  void flush()
}

export async function getReflection(id: string): Promise<Reflection | undefined> {
  return db.reflections.get(id)
}

export function liveReflectionsForPlacement(placementId: string) {
  // Used with useLiveQuery in components. Reverse chronological, excludes
  // soft-deleted rows.
  return async (): Promise<Reflection[]> => {
    const all = await db.reflections.where('placementId').equals(placementId).toArray()
    return all
      .filter((r) => !r.deletedAt)
      .sort((a, b) => (a.reflectedOn < b.reflectedOn ? 1 : a.reflectedOn > b.reflectedOn ? -1 : b.createdAt.localeCompare(a.createdAt)))
  }
}

export async function countReflectionsThisWeek(placementId: string): Promise<number> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const cutoff = weekAgo.toISOString().slice(0, 10)
  const all = await db.reflections.where('placementId').equals(placementId).toArray()
  return all.filter((r) => !r.deletedAt && r.reflectedOn >= cutoff).length
}
