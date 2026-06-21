import { db } from '@/src/db/schema'
import type { LocalProfile } from '@/src/db/schema'
import type { Profile } from './types'
import { enqueue } from '@/src/sync/queue'
import { flush } from '@/src/sync/engine'
import { createClient } from '@/src/auth/client'

export async function getProfile(userId: string): Promise<Profile | undefined> {
  const local = await db.profile.get(userId)
  if (local) return local

  // Returning user on a new device or cleared storage: the profile lives in
  // Postgres but not yet in Dexie. Hydrate it from the server so we DON'T force a
  // re-onboard — which would mint a duplicate placement and overwrite the profile
  // (the multi-year handoff is the fragile joint, spec §1). Falls through to
  // undefined (→ onboarding) only for a genuinely new account or when offline.
  try {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (!data) return undefined
    const profile: Profile = {
      id: data.id,
      fullName: data.full_name,
      universityId: data.university_id ?? undefined,
      program: data.program ?? undefined,
      cohort: data.cohort ?? undefined,
      yearLevel: data.year_level ?? undefined,
      nurseTrack: data.nurse_track,
      reminderDay: data.reminder_day,
      reminderTime: data.reminder_time ?? undefined,
      taggingOn: data.tagging_on,
    }
    await db.profile.put({ ...profile, synced: 1 })
    return profile
  } catch {
    return undefined
  }
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
