// The 8 placement-context tags (spec). A placement's `context` is one of these,
// or undefined ("general" — no filtering). Skills carry a `contexts[]`; a skill
// shows in a context if its contexts is empty/null (= all) or includes it.
export const PLACEMENT_CONTEXTS = [
  'Medical/Surgical',
  'Emergency',
  'Aged Care',
  'Mental Health',
  'Community/Primary Care',
  'Perioperative',
  'Paediatric',
  'Rehabilitation/Sub-acute',
] as const

export type PlacementContext = (typeof PLACEMENT_CONTEXTS)[number]

// Plain-language NMBA standard names — used in the custom-task standard picker.
export const NMBA_PLAIN: { id: number; label: string }[] = [
  { id: 1, label: 'Thinking critically' },
  { id: 2, label: 'Therapeutic relationships' },
  { id: 3, label: 'Maintaining my practice' },
  { id: 4, label: 'Conducting assessments' },
  { id: 5, label: 'Planning care' },
  { id: 6, label: 'Providing safe care' },
  { id: 7, label: 'Evaluating outcomes' },
]

// Maps a placement context → ward-guide slug for in-app priming.
export const CONTEXT_TO_GUIDE: Record<string, string> = {
  'Medical/Surgical': 'med-surg',
}

/** Does a skill (with its context tags) apply to the active placement context? */
export function skillInContext(contexts: string[] | undefined, context: string | null): boolean {
  if (!context) return true // general placement → show everything
  if (!contexts || contexts.length === 0) return true // skill applies to all contexts
  return contexts.includes(context)
}
