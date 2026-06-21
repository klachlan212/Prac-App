import { db } from '@/src/db/schema'
import type { LocalPlacement } from '@/src/db/schema'
import type { Placement } from './types'
import { newId, nowISO } from './ids'
import { enqueue } from '@/src/sync/queue'
import { flush } from '@/src/sync/engine'

export interface PlacementInput {
  ward?: string
  hospital?: string
  startDate?: string
  endDate?: string
}

export async function createPlacement(
  userId: string,
  input: PlacementInput
): Promise<string> {
  const now = nowISO()
  const record: LocalPlacement = {
    id: newId(),
    userId,
    ward: input.ward,
    hospital: input.hospital,
    startDate: input.startDate,
    endDate: input.endDate,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    synced: 0,
  }
  await db.placements.put(record)
  await enqueue('placement', record.id, 'upsert')
  void flush()
  return record.id
}

export async function getActivePlacement(userId: string): Promise<Placement | undefined> {
  const all = await db.placements.where('userId').equals(userId).toArray()
  return all.find((p) => p.status === 'active' && !p.deletedAt)
}

// The core loop needs somewhere to attach reflections. If a user reaches the
// editor without an active placement (e.g. all archived), create a blank one so
// a reflection is NEVER silently dropped (autosave + save both depend on this).
export async function getOrCreateActivePlacement(userId: string): Promise<Placement> {
  const existing = await getActivePlacement(userId)
  if (existing) return existing
  const id = await createPlacement(userId, {})
  return (await db.placements.get(id)) as Placement
}

export async function updatePlacement(
  id: string,
  patch: PlacementInput
): Promise<void> {
  await db.placements.update(id, { ...patch, updatedAt: nowISO(), synced: 0 })
  await enqueue('placement', id, 'upsert')
  void flush()
}

export async function archivePlacement(id: string): Promise<void> {
  await db.placements.update(id, { status: 'archived', updatedAt: nowISO(), synced: 0 })
  await enqueue('placement', id, 'upsert')
  void flush()
}
