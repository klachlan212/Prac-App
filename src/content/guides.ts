// Ward guides are a funnel, not a library (spec §6): texture, not facts — what a
// ward feels like, likely skills (standard-tagged), reflection prompts. No
// protocols, no clinical instruction. Build ONE first (med-surg). The byline MUST
// be a verifiably real nurse (name + face + background) — placeholder below for
// the founder to replace; that authenticity is the whole SEO edge.

export interface GuideSkill {
  name: string
  standard: number
}

export interface Guide {
  slug: string
  ward: string
  emoji: string
  readMins: number
  title: string
  intro: string
  feel: string[]
  skills: GuideSkill[]
  prompts: string[]
  byline: { name: string; background: string }
}

export const GUIDES: Record<string, Guide> = {
  'med-surg': {
    slug: 'med-surg',
    ward: 'Med-surg',
    emoji: '🏥',
    readMins: 4,
    title: 'So you’ve got a med-surg placement.',
    intro:
      'Here’s what it actually feels like on the floor — the rhythm, the skills you’ll keep meeting, and the moments worth thinking twice about. From someone who’s been there.',
    feel: [
      'The pace is relentless but rhythmic — a med round, then obs, then a call bell, then back again. You’ll feel behind for the first week. Everyone does.',
      'You’ll learn more from handover than from any textbook. Listen for what the outgoing nurse is worried about, not just the numbers.',
      'The win isn’t doing everything — it’s noticing the one patient who isn’t quite right and saying something early.',
    ],
    skills: [
      { name: 'Basic wound care & dressings', standard: 4 },
      { name: 'Medication administration', standard: 6 },
      { name: 'ISBAR handover', standard: 2 },
      { name: 'Recognising a patient who’s “off”', standard: 1 },
      { name: 'Fluid balance & daily weights', standard: 4 },
    ],
    prompts: [
      'The first time you sensed a patient was deteriorating before the obs confirmed it.',
      'A handover that went well — or didn’t — and what you’d do differently.',
      'A moment you spoke up for a patient, or wished you had.',
    ],
    byline: {
      // TODO(founder): replace with your real name + photo + background (§6).
      name: 'Written by a registered nurse',
      background: 'Acute & med-surg background · not AI, not a textbook',
    },
  },
}

export function getGuide(slug: string): Guide | undefined {
  return GUIDES[slug]
}

// Maps an onboarding ward selection to a guide slug, for in-app priming.
export const WARD_TO_GUIDE: Record<string, string> = {
  'Med-surg': 'med-surg',
}
