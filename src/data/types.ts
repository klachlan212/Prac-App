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
  context?: string
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

export type SkillStatus = 'new' | 'renewed'

// A skill logged against a shift. `skillId` ties to the library; `rawText` is the
// free-text fallback, queued for normalisation (spec §3) — never silently written
// to the structured corpus as a clean entry. `standardIds`/`itemCodes` are the
// pre-tagged NMBA mapping carried for the review step.
export interface LoggedSkill {
  id: string
  skillId?: string
  rawText?: string
  name: string
  status: SkillStatus
  standardIds: number[]
  itemCodes: string[]
  custom?: boolean
}

export type IdentifierKind = 'name' | 'age' | 'bed' | 'date' | 'phone' | 'mrn' | 'other'
export type IdentifierStatus = 'open' | 'fixed' | 'dismissed'

// A likely identifier flagged on-device (spec §4/§5). Persists into history so
// confidentiality is a running habit, resolved at the export gate.
export interface IdentifierFlag {
  id: string
  label: string
  kind: IdentifierKind
  status: IdentifierStatus
}

export interface Reflection {
  id: string
  placementId: string
  userId: string
  // `body` is a short summary (= whatHappened) kept for list/export/back-compat.
  body: string
  whatHappened?: string
  soWhat?: string
  nowWhat?: string
  status: 'draft' | 'saved'
  reflectedOn: string // 'YYYY-MM-DD'
  standardIds: number[]
  itemCodes: string[]
  tags: ReflectionTag[]
  skills: LoggedSkill[]
  identifierFlags: IdentifierFlag[]
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

// Reference data (read from world-readable tables).
export interface AnsatItem {
  code: string // e.g. '2.3'
  standardId: number
  ordinal: number
  label: string
}

export interface SkillLibraryEntry {
  id: string
  name: string
  category?: string
  contexts?: string[]
  standardIds: number[]
  itemCodes: string[]
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
