// Shared domain types. Local (camelCase) shapes mirror the Postgres tables
// defined in supabase/migrations/0001_initial.sql.

export type NurseTrack = 'RN' | 'EN'

export type ReminderChannel = 'email' | 'push' | 'off'

export type Theme = 'system' | 'light' | 'dark'

export interface Profile {
  id: string
  fullName: string
  universityId?: string
  program?: string
  cohort?: string
  yearLevel?: number
  nurseTrack: NurseTrack
  reminderDay: number // 0 = Sunday
  reminderTime?: string // 'HH:MM'
  taggingOn: boolean
}

export interface Placement {
  id: string
  userId: string
  ward?: string
  hospital?: string
  startDate?: string // 'YYYY-MM-DD'
  endDate?: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type TagKind = 'emotion' | 'topic'

export interface ReflectionTag {
  label: string
  kind: TagKind
  source: 'auto' | 'manual'
}

export interface Reflection {
  id: string
  placementId: string
  userId: string
  body: string
  reflectedOn: string // 'YYYY-MM-DD'
  standardIds: number[]
  tags: ReflectionTag[]
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface AnsatStandard {
  id: number
  track: NurseTrack
  ordinal: number
  title: string
  prompt?: string
}

export interface University {
  id: string
  name: string
  country: string
}
