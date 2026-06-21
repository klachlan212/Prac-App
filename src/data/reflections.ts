import { db } from '@/src/db/schema'
import type { LocalReflection } from '@/src/db/schema'
import type { Reflection, ReflectionTag, LoggedSkill, IdentifierFlag } from './types'
import { newId, nowISO, todayISO } from './ids'
import { enqueue } from '@/src/sync/queue'
import { flush } from '@/src/sync/engine'

// All reflection reads/writes go through Dexie first (local-first), then
// enqueue a sync op. Writing never waits on the network (CLAUDE.md §3).

export interface DraftReflection {
  id?: string
  placementId: string
  userId: string
  body?: string
  whatHappened?: string
  soWhat?: string
  nowWhat?: string
  status?: 'draft' | 'saved'
  reflectedOn?: string
  standardIds?: number[]
  itemCodes?: string[]
  tags?: ReflectionTag[]
  skills?: LoggedSkill[]
  identifierFlags?: IdentifierFlag[]
}

export async function saveReflection(draft: DraftReflection): Promise<string> {
  const now = nowISO()
  const existing = draft.id ? await db.reflections.get(draft.id) : undefined

  const whatHappened = draft.whatHappened ?? existing?.whatHappened
  // `body` keeps a short summary for the list/export surfaces and back-compat.
  const body = (whatHappened ?? draft.body ?? existing?.body ?? '').trim()

  const record: LocalReflection = {
    id: draft.id ?? newId(),
    placementId: draft.placementId,
    userId: draft.userId,
    body,
    whatHappened,
    soWhat: draft.soWhat ?? existing?.soWhat,
    nowWhat: draft.nowWhat ?? existing?.nowWhat,
    status: draft.status ?? existing?.status ?? 'saved',
    reflectedOn: draft.reflectedOn ?? existing?.reflectedOn ?? todayISO(),
    standardIds: draft.standardIds ?? existing?.standardIds ?? [],
    itemCodes: draft.itemCodes ?? existing?.itemCodes ?? [],
    tags: draft.tags ?? existing?.tags ?? [],
    skills: draft.skills ?? existing?.skills ?? [],
    identifierFlags: draft.identifierFlags ?? existing?.identifierFlags ?? [],
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
