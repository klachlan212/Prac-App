import Dexie, { type EntityTable } from 'dexie'
import type { Reflection, Placement, Profile } from '@/src/data/types'

// Local-first store. Every reflection/placement write lands here first
// (see CLAUDE.md §3) and is mirrored to Postgres by the sync engine.
// Reflections embed their standardIds and tags so a half-written, offline
// reflection is fully self-contained; the sync engine fans these out to the
// reflection_standards and reflection_tags join tables on the server.

export interface SyncQueueItem {
  id?: number
  entity: 'reflection' | 'placement' | 'profile'
  recordId: string
  operation: 'upsert' | 'delete'
  createdAt: string
}

// `synced` is 0/1 (not boolean) because IndexedDB cannot index booleans.
export type LocalReflection = Reflection & { synced: 0 | 1 }
export type LocalPlacement = Placement & { synced: 0 | 1 }
export type LocalProfile = Profile & { synced: 0 | 1 }

class PracDB extends Dexie {
  reflections!: EntityTable<LocalReflection, 'id'>
  placements!: EntityTable<LocalPlacement, 'id'>
  profile!: EntityTable<LocalProfile, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>

  constructor() {
    super('PracDB')
    this.version(1).stores({
      reflections: 'id, placementId, userId, reflectedOn, synced, deletedAt',
      placements: 'id, userId, status, synced',
      profile: 'id, synced',
      syncQueue: '++id, entity, recordId, createdAt',
    })
  }
}

export const db = new PracDB()
