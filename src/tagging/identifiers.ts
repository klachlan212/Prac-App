import type { IdentifierFlag, IdentifierKind } from '@/src/data/types'
import { newId } from '@/src/data/ids'

// Deterministic, on-device identifier heuristic (spec §5). It catches common
// STRUCTURED identifiers only — and the UI never claims completeness ("we flag
// what we can spot; the rest is on you", §4). No network, no LLM. On-device NER
// is a v2 recall upgrade.

const TITLES = '(?:Mr|Mrs|Ms|Miss|Dr|Sr|Prof)'

const PATTERNS: Array<{ kind: IdentifierKind; re: RegExp }> = [
  { kind: 'age', re: /\b\d{1,3}\s?(?:yo|y\/o|y\.o\.|year[- ]?old)s?\b/gi },
  { kind: 'bed', re: /\b(?:bed|room|bay|cubicle)\s?\d+[a-z]?\b/gi },
  { kind: 'mrn', re: /\b(?:mrn|ur|urn)\s?:?\s?\d{4,}\b/gi },
  { kind: 'phone', re: /\b0\d(?:[\s-]?\d){8}\b/g },
  { kind: 'mrn', re: /\b\d{6,}\b/g },
  { kind: 'date', re: /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g },
  // Title + name, and the "Mrs K" lone-initial case the mockups call out.
  { kind: 'name', re: new RegExp(`\\b${TITLES}\\.?\\s+[A-Z][a-zA-Z'’-]+\\b`, 'g') },
  { kind: 'name', re: new RegExp(`\\b${TITLES}\\.?\\s+[A-Z]\\b`, 'g') },
]

/**
 * Scan free text for likely identifiers. Returns de-duped flags (status 'open').
 * Pure and synchronous so it can run as the student types and offline.
 */
export function scanIdentifiers(text: string): IdentifierFlag[] {
  if (!text) return []
  const hits: Array<{ label: string; kind: IdentifierKind; index: number }> = []
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      hits.push({ label: m[0].trim(), kind, index: m.index })
      if (m.index === re.lastIndex) re.lastIndex++
    }
  }
  const seen = new Set<string>()
  const flags: IdentifierFlag[] = []
  for (const h of hits.sort((a, b) => a.index - b.index)) {
    const key = h.label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    flags.push({ id: newId(), label: h.label, kind: h.kind, status: 'open' })
  }
  return flags
}
