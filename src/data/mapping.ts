import type { LoggedSkill } from './types'

// Inferred NMBA-standard suggestion (spec §3/§5). This is a JOIN, not inference:
// the union of standards carried by logged skills (library is pre-tagged) plus a
// small keyword→standard table over the reflection text. Deterministic and
// auditable — never an LLM, never off-device.
const KEYWORD_STANDARDS: Array<{ re: RegExp; standardId: number }> = [
  { re: /communicat|listen|rapport|famil|distress|therapeutic|reassur/i, standardId: 2 },
  { re: /assess|observation|\bobs\b|vital|history|examin|baseline/i, standardId: 4 },
  { re: /plan|prioritis|prioritiz|\bgoal/i, standardId: 5 },
  { re: /medicat|administ|safe|escalat|deteriorat|polic|guideline|isbar/i, standardId: 6 },
  { re: /critical|notice|recognis|recogniz|evidence|question|judg/i, standardId: 1 },
  { re: /evaluat|outcome|review|next time|differently|worked well/i, standardId: 7 },
  { re: /scope|learn|wellbeing|capabilit|supervis/i, standardId: 3 },
]

/** Candidate NMBA standard ids for a reflection, from its skills + text. */
export function inferStandards(skills: LoggedSkill[], text: string): number[] {
  const fromSkills = skills.flatMap((s) => s.standardIds)
  const fromText = KEYWORD_STANDARDS.filter((k) => k.re.test(text ?? '')).map((k) => k.standardId)
  return Array.from(new Set([...fromSkills, ...fromText])).sort((a, b) => a - b)
}
