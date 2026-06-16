import Dexie, { type EntityTable } from 'dexie'

interface LocalReflection {
  id: string
  placementId: string
  userId: string
  body: string
  reflectedOn: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  synced: boolean
}

interface LocalPlacement {
  id: string
  userId: string
  ward?: string
  hospital?: string
  startDate?: string
  endDate?: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
  synced: boolean
}

interface SyncQueueItem {
  id?: number
  table: string
  recordId: string
  operation: 'upsert' | 'delete'
  payload: unknown
  createdAt: string
}

class PracDB extends Dexie {
  reflections!: EntityTable<LocalReflection, 'id'>
  placements!: EntityTable<LocalPlacement, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>

  constructor() {
    super('PracDB')
    this.version(1).stores({
      reflections: 'id, placementId, userId, reflectedOn, synced',
      placements: 'id, userId, status, synced',
      syncQueue: '++id, table, recordId, createdAt',
    })
  }
}

export const db = new PracDB()
export type { LocalReflection, LocalPlacement, SyncQueueItem }
