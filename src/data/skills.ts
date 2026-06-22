import { createClient } from '@/src/auth/client'
import type { SkillLibraryEntry, AnsatItem, NurseTrack } from './types'

// Reference data for the core loop: the skill library (pre-tagged to NMBA/ANSAT
// items via skill_ansat_map) and the item list. World-readable, cached in memory.
// The client computes the mapping suggestion; nothing is inferred server-side (§5).

type CachedSkill = SkillLibraryEntry & { track: NurseTrack }
let skillCache: CachedSkill[] | null = null
let itemCache: AnsatItem[] | null = null

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs))
}

export async function getSkillLibrary(track: NurseTrack = 'RN'): Promise<SkillLibraryEntry[]> {
  if (!skillCache) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('skill_library')
      .select('id, name, category, track, contexts, skill_ansat_map(standard_id, item_code)')
      .order('name')
    // Never cache an empty/failed read (offline first-load), or skill search is
    // silently dead for the whole session. Return empty now, retry next call.
    if (error || !data || data.length === 0) return []
    skillCache = data.map((s: any) => {
      const maps = (s.skill_ansat_map ?? []) as Array<{ standard_id: number; item_code: string | null }>
      return {
        id: s.id,
        name: s.name,
        category: s.category ?? undefined,
        track: s.track,
        contexts: (s.contexts as string[] | null) ?? undefined,
        standardIds: uniq(maps.map((m) => m.standard_id)),
        itemCodes: uniq(maps.map((m) => m.item_code).filter((c): c is string => !!c)),
      }
    })
  }
  return skillCache.filter((s) => s.track === track)
}

export async function getAnsatItems(): Promise<AnsatItem[]> {
  if (!itemCache) {
    const supabase = createClient()
    const { data, error } = await supabase.from('ansat_items').select('*').order('ordinal')
    if (error || !data || data.length === 0) return []
    itemCache = data.map((i: any) => ({
      code: i.code,
      standardId: i.standard_id,
      ordinal: i.ordinal,
      label: i.label,
    }))
  }
  return itemCache
}
