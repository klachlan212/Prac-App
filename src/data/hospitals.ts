import { createClient } from '@/src/auth/client'
import type { Confidence, ReferenceCard, Tip, TipCategory } from '@/src/content/hospitals'

// Client data layer for the Hospital Directory. Reads of PUBLISHED tips +
// reference cards are governed by RLS (anon-readable). Writes go through the
// hardened SECURITY DEFINER RPCs: submissions land in the moderation queue,
// votes are deduped best-effort by an anonymous device token.

const VOTER_KEY = 'prac.hospital.voter'

/** A stable per-device token so a visitor's votes dedupe without an account. */
export function getVoterToken(): string {
  if (typeof window === 'undefined') return ''
  let t = localStorage.getItem(VOTER_KEY)
  if (!t) {
    t = crypto.randomUUID()
    localStorage.setItem(VOTER_KEY, t)
  }
  return t
}

interface TipRow {
  id: string
  hospital_id: string
  category: string
  sub_category: string | null
  text: string
  upvotes: number
  downvotes: number
  verification_date: string
  submitted_by: string
  submitted_at: string
  verified_by: string | null
  confidence_level: string | null
  is_published: boolean
}

function mapTip(r: TipRow): Tip {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    category: r.category as TipCategory,
    subCategory: r.sub_category ?? undefined,
    text: r.text,
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    verificationDate: r.verification_date,
    submittedBy: r.submitted_by,
    submittedAt: r.submitted_at,
    verifiedBy: r.verified_by ?? undefined,
    confidenceLevel: (r.confidence_level as Confidence | null) ?? undefined,
    isPublished: r.is_published,
  }
}

const TIP_COLS =
  'id, hospital_id, category, sub_category, text, upvotes, downvotes, verification_date, submitted_by, submitted_at, verified_by, confidence_level, is_published'

export async function fetchTips(hospitalId: string): Promise<Tip[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hospital_tips')
    .select(TIP_COLS)
    .eq('hospital_id', hospitalId)
    .eq('is_published', true)
  if (error) throw error
  return ((data as TipRow[]) ?? []).map(mapTip)
}

interface RefRow {
  id: string
  hospital_id: string
  category: string
  text: string
  source_url: string
  source_label: string
}

export async function fetchRefCards(hospitalId: string): Promise<ReferenceCard[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hospital_reference_cards')
    .select('id, hospital_id, category, text, source_url, source_label')
    .eq('hospital_id', hospitalId)
  if (error) throw error
  return ((data as RefRow[]) ?? []).map((r) => ({
    id: r.id,
    hospitalId: r.hospital_id,
    category: r.category as TipCategory,
    text: r.text,
    sourceUrl: r.source_url,
    sourceLabel: r.source_label,
  }))
}

export async function fetchTipCount(hospitalId: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('hospital_tips')
    .select('id', { count: 'exact', head: true })
    .eq('hospital_id', hospitalId)
    .eq('is_published', true)
  return count ?? 0
}

export interface SubmitTipInput {
  hospitalId: string
  category: TipCategory
  text: string
  subCategory?: string | null
  confidence?: Confidence | null
  verificationDate: string
  anonymous: boolean
}

/** Submit a tip → moderation queue (never published directly). */
export async function submitTip(input: SubmitTipInput): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('submit_hospital_tip', {
    p_hospital_id: input.hospitalId,
    p_category: input.category,
    p_text: input.text,
    p_sub_category: input.subCategory ?? null,
    p_confidence: input.confidence ?? null,
    p_verification_date: input.verificationDate,
    p_anonymous: input.anonymous,
  })
  if (error) throw error
}

/** Cast / toggle a vote; returns the authoritative new counts. */
export async function castVote(
  tipId: string,
  dir: 1 | -1
): Promise<{ upvotes: number; downvotes: number }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('cast_hospital_vote', {
    p_tip: tipId,
    p_token: getVoterToken(),
    p_dir: dir,
  })
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as { upvotes: number; downvotes: number }
  return { upvotes: row.upvotes, downvotes: row.downvotes }
}
