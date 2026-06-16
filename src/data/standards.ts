import { createClient } from '@/src/auth/client'
import type { AnsatStandard, University, NurseTrack } from './types'

// Reference data is read from the server (world-readable tables) and cached in
// memory. We read standards filtered by track so the Enrolled Nurse set can be
// added later with no interface change (CLAUDE.md §3).

let standardsCache: AnsatStandard[] | null = null
let universitiesCache: University[] | null = null

export async function getStandards(track: NurseTrack = 'RN'): Promise<AnsatStandard[]> {
  if (!standardsCache) {
    const supabase = createClient()
    const { data } = await supabase
      .from('ansat_standards')
      .select('*')
      .order('ordinal')
    standardsCache = (data ?? []).map((s) => ({
      id: s.id,
      track: s.track,
      ordinal: s.ordinal,
      title: s.title,
      prompt: s.prompt ?? undefined,
    }))
  }
  return standardsCache.filter((s) => s.track === track)
}

export async function getUniversities(): Promise<University[]> {
  if (!universitiesCache) {
    const supabase = createClient()
    const { data } = await supabase.from('universities').select('*').order('name')
    universitiesCache = (data ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
    }))
  }
  return universitiesCache
}
