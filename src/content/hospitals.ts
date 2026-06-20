// Hospital Directory (founder build, 20 Jun 2026). Practical, hospital-WIDE
// logistics to take the edge off a first shift — parking, access, food, culture.
// NOT a ward guide and NOT clinical content. Scope guardrail is enforced in copy:
// no ward-specific tips, no gossip, no patient/confidential info.
//
// v1 is a front-end build over seed data + client state (voting/submission are
// in-session; submissions route to a "Lachlan reviews before publishing" success
// state). Persisting to Supabase with RLS + a real moderation queue — and the care
// anonymous writes need — is the deliberate next step, not done here.

export type TipCategory = 'Transit' | 'StreetCheat' | 'WardLogistics' | 'ShiftFuel' | 'Expectations'

export type Confidence = 'High' | 'Medium' | 'Low'

export interface Tip {
  id: string
  hospitalId: string
  category: TipCategory
  subCategory?: string // Expectations only
  text: string // ≤300 chars
  upvotes: number
  downvotes: number
  verificationDate: string // ISO date — last time the info was confirmed
  submittedBy: string // role label, or "Anonymous"
  submittedAt: string // ISO
  verifiedBy?: string // 'Lachlan' for hand-seeded; undefined = community submission
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
  empathyPrompt: string // sparse-state, high-empathy
  cta: string // sparse-state CTA, e.g. "Share parking info"
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

// ── Seed hospitals ──────────────────────────────────────────────────────────
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

// ── Seed tips ───────────────────────────────────────────────────────────────
// Dates are relative to ~20 Jun 2026 to demonstrate fresh / aging / stale states.
// Specifics are deliberately hedged ("check the signage", "ask the office") —
// freshness + verification do the rest. General logistics guidance, not gospel.
export const TIPS: Tip[] = [
  // Royal Melbourne — Transit: POPULATE (incl. one stale tip for the fade demo)
  {
    id: 'rmh-tr-1',
    hospitalId: 'royal-melbourne',
    category: 'Transit',
    text: 'The hospital car park is off Flemington Rd — casual rates add up fast over a full shift. If you’re here for weeks, ask the car park office about a discounted multi-entry staff/student permit before you start paying daily.',
    upvotes: 28,
    downvotes: 1,
    verificationDate: '2026-06-12',
    submittedBy: 'Lachlan',
    submittedAt: '2026-06-12',
    verifiedBy: 'Lachlan',
    confidenceLevel: 'High',
    isPublished: true,
  },
  {
    id: 'rmh-tr-2',
    hospitalId: 'royal-melbourne',
    category: 'Transit',
    text: 'Trams 19, 57 and 59 all stop near the Royal Parade / Flemington Rd corner — a 5–7 min walk to the main entrance. Cheaper than parking and you skip the morning boom-gate queue.',
    upvotes: 19,
    downvotes: 0,
    verificationDate: '2026-05-30',
    submittedBy: '2nd-year student',
    submittedAt: '2026-05-30',
    confidenceLevel: 'Medium',
    isPublished: true,
  },
  {
    id: 'rmh-tr-3',
    hospitalId: 'royal-melbourne',
    category: 'Transit',
    text: 'If you finish after the trams thin out, the night network bus runs along Royal Parade. Check the PTV app the night before — times shift on weekends.',
    upvotes: 8,
    downvotes: 1,
    verificationDate: '2026-04-18',
    submittedBy: '3rd-year student',
    submittedAt: '2026-04-18',
    confidenceLevel: 'Low',
    isPublished: true,
  },
  {
    id: 'rmh-tr-4',
    hospitalId: 'royal-melbourne',
    category: 'Transit',
    text: 'Early-bird parking at the Melbourne Uni car parks on Grattan St can work out cheaper if you’re in before 8am and out by evening.',
    upvotes: 14,
    downvotes: 3,
    verificationDate: '2025-11-05', // >6 months → faded + refresh banner
    submittedBy: 'Student',
    submittedAt: '2025-11-05',
    confidenceLevel: 'Medium',
    isPublished: true,
  },
  // Royal Melbourne — Ward logistics & access: HYBRID (2 tips + reference cards)
  {
    id: 'rmh-wl-1',
    hospitalId: 'royal-melbourne',
    category: 'WardLogistics',
    text: 'Sort your hospital ID/swipe on day one — the access & ID office is in the main building; bring your student ID and placement letter. Without a swipe you’ll be buzzing for every door.',
    upvotes: 22,
    downvotes: 0,
    verificationDate: '2026-06-08',
    submittedBy: 'Lachlan',
    submittedAt: '2026-06-08',
    verifiedBy: 'Lachlan',
    confidenceLevel: 'High',
    isPublished: true,
  },
  {
    id: 'rmh-wl-2',
    hospitalId: 'royal-melbourne',
    category: 'WardLogistics',
    text: 'Student lockers are limited and fill fast — bring a padlock and claim one early, or use the change-room cubbies for valuables.',
    upvotes: 11,
    downvotes: 1,
    verificationDate: '2026-05-12',
    submittedBy: 'Student',
    submittedAt: '2026-05-12',
    confidenceLevel: 'Medium',
    isPublished: true,
  },
  // Royal Melbourne — Shift fuel: POPULATE
  {
    id: 'rmh-sf-1',
    hospitalId: 'royal-melbourne',
    category: 'ShiftFuel',
    text: 'The staff cafeteria does a cheap early breakfast before 7am — handy if you skipped it. Hot food winds down mid-afternoon, so grab lunch before 2pm on a late.',
    upvotes: 17,
    downvotes: 0,
    verificationDate: '2026-06-10',
    submittedBy: 'Lachlan',
    submittedAt: '2026-06-10',
    verifiedBy: 'Lachlan',
    confidenceLevel: 'High',
    isPublished: true,
  },
  {
    id: 'rmh-sf-2',
    hospitalId: 'royal-melbourne',
    category: 'ShiftFuel',
    text: 'There’s a 24h vending bank near the main lifts and a microwave in most ward tea rooms — bring leftovers, the nearby cafés don’t open till 7.',
    upvotes: 9,
    downvotes: 0,
    verificationDate: '2026-05-20',
    submittedBy: 'EN student',
    submittedAt: '2026-05-20',
    confidenceLevel: 'Medium',
    isPublished: true,
  },
  {
    id: 'rmh-sf-3',
    hospitalId: 'royal-melbourne',
    category: 'ShiftFuel',
    text: 'Lygon St is a 10-min walk for a proper coffee on a break; for a quick one the foyer kiosk opens around 6:30am.',
    upvotes: 6,
    downvotes: 1,
    verificationDate: '2026-04-30',
    submittedBy: 'Student',
    submittedAt: '2026-04-30',
    confidenceLevel: 'Low',
    isPublished: true,
  },
  // (Royal Melbourne — Street Cheat & Expectations intentionally empty → sparse)

  // The Alfred — a couple of community tips so a 2nd hospital is browsable
  {
    id: 'alf-tr-1',
    hospitalId: 'the-alfred',
    category: 'Transit',
    text: 'The Alfred is right on Commercial Rd — the 72 tram and the Sandringham line (Prahran/Windsor) both drop you within a few minutes’ walk. Parking on-site is limited and pricey.',
    upvotes: 12,
    downvotes: 0,
    verificationDate: '2026-06-02',
    submittedBy: '3rd-year student',
    submittedAt: '2026-06-02',
    confidenceLevel: 'Medium',
    isPublished: true,
  },
  {
    id: 'alf-sf-1',
    hospitalId: 'the-alfred',
    category: 'ShiftFuel',
    text: 'Chapel St is two minutes away for food but adds up; the staff cafeteria and a 24h vending area cover night shifts.',
    upvotes: 7,
    downvotes: 0,
    verificationDate: '2026-05-22',
    submittedBy: 'Student',
    submittedAt: '2026-05-22',
    confidenceLevel: 'Low',
    isPublished: true,
  },

  // University Hospital Geelong — one tip
  {
    id: 'uhg-tr-1',
    hospitalId: 'university-hospital-geelong',
    category: 'Transit',
    text: 'Street parking around Ryrie St / Bellerine St fills early; the hospital decks are easiest but check the daily cap. Geelong station is a 15-min walk or a short bus.',
    upvotes: 9,
    downvotes: 0,
    verificationDate: '2026-06-01',
    submittedBy: '2nd-year student',
    submittedAt: '2026-06-01',
    confidenceLevel: 'Medium',
    isPublished: true,
  },
]

export const REFERENCE_CARDS: ReferenceCard[] = [
  {
    id: 'rmh-ref-tr-1',
    hospitalId: 'royal-melbourne',
    category: 'Transit',
    text: 'Official parking rates, permits and validation — current rates and how to apply for a multi-entry permit.',
    sourceUrl: 'https://www.thermh.org.au/patients-visitors/getting-here',
    sourceLabel: 'thermh.org.au',
  },
  {
    id: 'rmh-ref-wl-1',
    hospitalId: 'royal-melbourne',
    category: 'WardLogistics',
    text: 'Student placement orientation — ID, swipe access and your first-day checklist.',
    sourceUrl: 'https://www.thermh.org.au/health-professionals/students',
    sourceLabel: 'RMH · Students',
  },
  {
    id: 'rmh-ref-wl-2',
    hospitalId: 'royal-melbourne',
    category: 'WardLogistics',
    text: 'After-hours entry and security escort — how to enter and move safely outside business hours.',
    sourceUrl: 'https://www.thermh.org.au/patients-visitors/getting-here',
    sourceLabel: 'RMH · Security',
  },
  {
    id: 'rmh-ref-wl-3',
    hospitalId: 'royal-melbourne',
    category: 'WardLogistics',
    text: 'Lost or faulty ID/swipe replacement — where to go and what to bring.',
    sourceUrl: 'https://www.thermh.org.au/health-professionals/students',
    sourceLabel: 'RMH · Access office',
  },
]

export function tipsFor(hospitalId: string): Tip[] {
  return TIPS.filter((t) => t.hospitalId === hospitalId && t.isPublished)
}

export function refCardsFor(hospitalId: string): ReferenceCard[] {
  return REFERENCE_CARDS.filter((r) => r.hospitalId === hospitalId)
}

export function tipCountFor(hospitalId: string): number {
  return tipsFor(hospitalId).length
}

// ── Ranking & freshness (pure, deterministic) ───────────────────────────────
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

export type FreshnessStage = 'fresh' | 'aging' | 'fading' | 'stale'

export function freshnessStage(iso: string, now: number): FreshnessStage {
  const d = ageDays(iso, now)
  if (d <= 90) return 'fresh'
  if (d <= 92) return 'aging' // (kept for completeness; main fade boundaries below)
  if (d <= 182) return 'fading'
  return 'stale'
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
