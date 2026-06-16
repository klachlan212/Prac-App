import type { ReflectionTag } from '@/src/data/types'
import {
  EMOTION_LEXICON,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  TOPIC_KEYWORDS,
  STOP_WORDS,
} from './lexicon'

// On-device suggestion engine. Pure function over text — no network, no state.
// Output is a *suggestion*; the student confirms or dismisses each tag and only
// confirmed tags are stored (CLAUDE.md §2.6).

export interface Suggestions {
  sentiment: 'positive' | 'negative' | 'neutral'
  emotions: string[]
  topics: string[]
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function suggestTags(text: string): Suggestions {
  const lower = text.toLowerCase()
  const tokens = tokenize(text)
  const tokenSet = new Set(tokens)

  // Sentiment: simple net polarity count.
  let score = 0
  for (const t of tokens) {
    if (POSITIVE_WORDS.has(t)) score += 1
    if (NEGATIVE_WORDS.has(t)) score -= 1
  }
  const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'

  // Emotions: match lexicon words/phrases.
  const emotions: string[] = []
  for (const [emotion, words] of Object.entries(EMOTION_LEXICON)) {
    if (words.some((w) => (w.includes(' ') ? lower.includes(w) : tokenSet.has(w)))) {
      emotions.push(emotion)
    }
  }

  // Topics: keyword categories, then fall back to frequent salient words.
  const topics: string[] = []
  for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
    if (words.some((w) => tokenSet.has(w))) topics.push(topic)
  }

  if (topics.length < 3) {
    const freq = new Map<string, number>()
    for (const t of tokens) {
      if (t.length < 4 || STOP_WORDS.has(t)) continue
      freq.set(t, (freq.get(t) ?? 0) + 1)
    }
    const extra = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w)
      .filter((w) => !topics.includes(w))
      .slice(0, 3 - topics.length)
    topics.push(...extra)
  }

  return { sentiment, emotions: emotions.slice(0, 4), topics: topics.slice(0, 4) }
}

// Convert confirmed suggestion labels into stored tag records.
export function toTags(
  emotions: string[],
  topics: string[],
  source: 'auto' | 'manual' = 'auto'
): ReflectionTag[] {
  return [
    ...emotions.map((label) => ({ label, kind: 'emotion' as const, source })),
    ...topics.map((label) => ({ label, kind: 'topic' as const, source })),
  ]
}
