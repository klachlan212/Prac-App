import { db, type SyncQueueItem } from '@/src/db/schema'
import { nowISO } from '@/src/data/ids'

// Enqueue a mutation for the sync engine. Writing is never blocked on
// connectivity (CLAUDE.md §3): callers write to Dexie, then enqueue here.
export async function enqueue(
  entity: SyncQueueItem['entity'],
  recordId: string,
  operation: SyncQueueItem['operation']
): Promise<void> {
  await db.syncQueue.add({ entity, recordId, operation, createdAt: nowISO() })
}
