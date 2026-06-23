// The 8 reflection topics (spec). The student picks one before "What happened?";
// it swaps the prompt, pre-maps NMBA standards for the review step, and scopes
// which skills are surfaced (skillStandards). An empty skillStandards = the full
// taxonomy (still filtered by placement context).
export interface ReflectionTopic {
  id: string
  emoji: string
  label: string
  placeholder: string
  standards: number[]
  skillStandards: number[]
}

export const TOPICS: ReflectionTopic[] = [
  {
    id: 'skill',
    emoji: '🩺',
    label: 'A clinical skill I performed',
    placeholder: 'One moment from today: what did you do, and how did it go?',
    standards: [4, 6],
    skillStandards: [],
  },
  {
    id: 'interaction',
    emoji: '💬',
    label: 'A patient interaction',
    placeholder: 'Tell me about the patient: what happened between you, and what were you thinking?',
    standards: [2],
    skillStandards: [2],
  },
  {
    id: 'handover',
    emoji: '📋',
    label: 'A handover or documentation moment',
    placeholder: 'What did you hand over or document, and what made it tricky or useful?',
    standards: [5, 7],
    skillStandards: [5, 7],
  },
  {
    id: 'medsafety',
    emoji: '💊',
    label: 'A medication or safety event',
    placeholder:
      'What happened with the medication or safety situation: what did you notice, and what did you do?',
    standards: [1, 6],
    skillStandards: [1, 6],
  },
  {
    id: 'unplanned',
    emoji: '🔄',
    label: 'Something that didn’t go to plan',
    placeholder: 'Walk me through it: what happened, and what would you do differently?',
    standards: [1, 7],
    skillStandards: [1, 7],
  },
  {
    id: 'observed',
    emoji: '👀',
    label: 'Something I observed but didn’t do myself',
    placeholder: 'What did you see or hear, and what did it teach you?',
    standards: [1],
    skillStandards: [1],
  },
  {
    id: 'depth',
    emoji: '🌊',
    label: 'A moment I felt out of my depth',
    placeholder: 'What was happening, and what did you do when you weren’t sure?',
    standards: [1, 3],
    skillStandards: [1, 3],
  },
  {
    id: 'team',
    emoji: '🤝',
    label: 'A team or scope-of-practice moment',
    placeholder: 'What happened with the team: who was involved, and where did you fit?',
    standards: [2, 3, 5],
    skillStandards: [2, 3, 5],
  },
]
