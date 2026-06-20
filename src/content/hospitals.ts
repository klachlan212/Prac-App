// Hospital Directory (founder build, 20 Jun 2026). Practical, hospital-WIDE
// logistics to take the edge off a first shift — parking, access, food, culture.
// NOT a ward guide and NOT clinical content. Scope guardrail is enforced in copy:
// no ward-specific tips, no gossip, no patient/confidential info.
//
// This file holds the static hospital ROSTER (for fast routing, metadata and
// generateStaticParams), the category definitions, and the pure ranking/freshness
// helpers. The dynamic, community data — tips, reference cards, votes — lives in
// Supabase (migration 0004) and is fetched/written via src/data/hospitals.ts.

export type TipCategory = 'Transit' | 'StreetCheat' | 'WardLogistics' | 'ShiftFuel' | 'Expectations'

export type Confidence = 'High' | 'Medium' | 'Low'

export interface Tip {
  id: string
  hospitalId: string
  category: TipCategory
  subCategory?: string
  text: string
  upvotes: number
  downvotes: number
  verificationDate: string // ISO date — last time the info was confirmed
  submittedBy: string
  submittedAt: string
  verifiedBy?: string // 'Lachlan' for hand-seeded; undefined = community
  confidenceLevel?: Confidence
  isPublished: boolean
}

export interface ReferenceCard {
  id: string
  hospitalId: string
  category: TipCategory
  text: string
  sourceUrl: string
  sourceLabel: string
}

export interface Hospital {
  id: string
  slug: string
  name: string
  location: string
  region: 'Melbourne' | 'Geelong'
  intro: string
  curatedBy: string
}

export interface SubPrompt {
  key: string
  label: string
}

export interface CategoryMeta {
  id: TipCategory
  emoji: string
  label: string
  blurb: string
  empathyPrompt: string
  cta: string
  /** Tailwind classes for the section's tinted header (existing tokens only). */
  tint: string
  accent: string
  subPrompts?: SubPrompt[]
  caution?: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'Transit',
    emoji: '🚗',
    label: 'Official transit & parking',
    blurb: 'Decks, permits, public transport and walk times — the sanctioned ways in.',
    empathyPrompt: 'Have you parked or commuted here yet? Two lines could save a future student the 6am scramble.',
    cta: 'Share transit info',
    tint: 'bg-new',
    accent: 'text-teal-deep',
  },
  {
    id: 'StreetCheat',
    emoji: '🤫',
    label: 'The “street cheat”',
    blurb: 'Community-mapped unofficial parking. Read the signs — this one’s on you.',
    empathyPrompt: 'Found a legal park the meters don’t know about? Share it — but check the time limits and ranger patterns first.',
    cta: 'Share a parking spot',
    tint: 'bg-plum-bg',
    accent: 'text-plum-ink',
    caution:
      'Unofficial and community-mapped. Time limits, clearways and ranger patterns change — always read the signs. Tips older than 3 months are downranked.',
  },
  {
    id: 'WardLogistics',
    emoji: '🔑',
    label: 'Logistics & access',
    blurb: 'ID and swipe-card office, student lockers, after-hours entry.',
    empathyPrompt: 'Know where the swipe-card office or student lockers are? Help someone skip the day-one runaround.',
    cta: 'Share access info',
    tint: 'bg-sage-50',
    accent: 'text-ink',
  },
  {
    id: 'ShiftFuel',
    emoji: '☕',
    label: 'Shift fuel',
    blurb: 'Staff dining, 24h vending, microwaves, and early-opening cafés nearby.',
    empathyPrompt: 'Where do you actually eat on a long shift? Point the next student to it.',
    cta: 'Share a food tip',
    tint: 'bg-flag-bg',
    accent: 'text-flag-ink',
  },
  {
    id: 'Expectations',
    emoji: '💬',
    label: 'Shift expectations & bottlenecks',
    blurb: 'How shifts really run here — breaks, delays, culture. Honest, non-identifying notes only.',
    empathyPrompt: 'What surprised you about how shifts really run here? Honest, non-identifying notes only.',
    cta: 'Share what to expect',
    tint: 'bg-sage-100',
    accent: 'text-ink',
    subPrompts: [
      { key: 'meal-break', label: 'Meal-break autonomy' },
      { key: 'infrastructure', label: 'Infrastructure delays' },
      { key: 'staffing', label: 'Staffing culture' },
    ],
  },
]

export function categoryMeta(id: TipCategory): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) as CategoryMeta
}

// ── Hospital roster (static; mirrors the `hospitals` table) ───────────────────
export const HOSPITALS: Hospital[] = [
  {
    id: 'royal-melbourne',
    slug: 'royal-melbourne',
    name: 'The Royal Melbourne Hospital',
    location: 'Parkville, VIC',
    region: 'Melbourne',
    intro:
      'Big, busy, and a lot to take in on day one. Here’s the practical stuff — where to park, how to get in, where to eat — so your first shift is one less thing to dread.',
    curatedBy: 'Lachlan',
  },
  {
    id: 'the-alfred',
    slug: 'the-alfred',
    name: 'The Alfred',
    location: 'Melbourne (Prahran), VIC',
    region: 'Melbourne',
    intro: 'A major trauma hospital on Commercial Rd. The logistics that trip up new students on day one, sorted.',
    curatedBy: 'Lachlan',
  },
  {
    id: 'st-vincents-melbourne',
    slug: 'st-vincents-melbourne',
    name: 'St Vincent’s Hospital Melbourne',
    location: 'Fitzroy, VIC',
    region: 'Melbourne',
    intro: 'Inner-city and tight on space. The practical know-how for getting in and getting fed.',
    curatedBy: 'Lachlan',
  },
  {
    id: 'austin',
    slug: 'austin',
    name: 'Austin Hospital',
    location: 'Heidelberg, VIC',
    region: 'Melbourne',
    intro: 'Out in Heidelberg with its own rhythm. Parking, transport and the day-one essentials.',
    curatedBy: 'Lachlan',
  },
  {
    id: 'monash-medical-centre',
    slug: 'monash-medical-centre',
    name: 'Monash Medical Centre',
    location: 'Clayton, VIC',
    region: 'Melbourne',
    intro: 'Clayton’s big tertiary hub. The getting-there-and-settling-in basics.',
    curatedBy: 'Lachlan',
  },
  {
    id: 'university-hospital-geelong',
    slug: 'university-hospital-geelong',
    name: 'University Hospital Geelong',
    location: 'Geelong, VIC (Barwon Health)',
    region: 'Geelong',
    intro: 'Barwon Health’s main site. Parking and transport from someone who’s done the drive.',
    curatedBy: 'Lachlan',
  },
]

export function getHospital(slug: string): Hospital | undefined {
  return HOSPITALS.find((h) => h.slug === slug)
}

// ── Ranking & freshness (pure, deterministic) ────────────────────────────────
const DAY = 86_400_000

export function ageDays(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY))
}

/** Recency multiplier from the last verification date (build-spec table). */
export function recencyMultiplier(iso: string, now: number): number {
  const d = ageDays(iso, now)
  if (d <= 14) return 1.5
  if (d <= 28) return 1.2
  if (d <= 90) return 1.0
  if (d <= 182) return 0.7
  return 0.4
}

/** Curation weight: hand-verified outranks community, weighted by confidence. */
export function curationWeight(tip: Tip): number {
  if (tip.verifiedBy) return 1.0
  switch (tip.confidenceLevel) {
    case 'High':
      return 0.9
    case 'Low':
      return 0.6
    case 'Medium':
    default:
      return 0.8
  }
}

export function netVotes(tip: Tip): number {
  return tip.upvotes - tip.downvotes
}

export function scoreTip(tip: Tip, now: number): number {
  return netVotes(tip) * recencyMultiplier(tip.verificationDate, now) * curationWeight(tip)
}

/** Relevance = share of votes that are positive. Null when never voted on. */
export function relevancePct(up: number, down: number): number | null {
  const total = up + down
  if (total === 0) return null
  return Math.round((up / total) * 100)
}

/** >6 months: heavy fade + a "refresh this info?" banner. */
export function isStale(iso: string, now: number): boolean {
  return ageDays(iso, now) > 182
}

/** Street-cheat tips downrank visually past 3 months even before the stale fade. */
export function isAgingStreetCheat(tip: Tip, now: number): boolean {
  return tip.category === 'StreetCheat' && ageDays(tip.verificationDate, now) > 90
}

export function relativeTime(iso: string, now: number): string {
  const d = ageDays(iso, now)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 31) {
    const w = Math.round(d / 7)
    return `${w} week${w === 1 ? '' : 's'} ago`
  }
  if (d < 365) {
    const m = Math.round(d / 30)
    return `${m} month${m === 1 ? '' : 's'} ago`
  }
  const y = Math.round(d / 365)
  return `${y} year${y === 1 ? '' : 's'} ago`
}
