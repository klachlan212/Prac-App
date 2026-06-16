import { db } from '@/src/db/schema'
import type { LocalProfile } from '@/src/db/schema'
import type { Profile } from './types'
import { enqueue } from '@/src/sync/queue'
import { flush } from '@/src/sync/engine'

export async function getProfile(userId: string): Promise<Profile | undefined> {
  return db.profile.get(userId)
}

export async function saveProfile(profile: Profile): Promise<void> {
  const record: LocalProfile = { ...profile, synced: 0 }
  await db.profile.put(record)
  await enqueue('profile', profile.id, 'upsert')
  void flush()
}

export async function updateProfile(
  userId: string,
  patch: Partial<Omit<Profile, 'id'>>
): Promise<void> {
  const current = await db.profile.get(userId)
  if (!current) return
  const next: LocalProfile = { ...current, ...patch, synced: 0 }
  await db.profile.put(next)
  await enqueue('profile', userId, 'upsert')
  void flush()
}
