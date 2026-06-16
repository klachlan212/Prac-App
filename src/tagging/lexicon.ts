// Tier-one, on-device tagging lexicon (CLAUDE.md §2.6, spec §5.5).
// Deliberately small, deterministic, and fully offline. All emotion words below
// are authored here under an open licence to avoid the NRC commercial-licence
// caveat in the spec. NOTHING here ever calls the network.

export const EMOTION_LEXICON: Record<string, string[]> = {
  anxious: [
    'anxious', 'anxiety', 'nervous', 'worried', 'worry', 'scared', 'afraid',
    'panic', 'uneasy', 'apprehensive', 'tense', 'stress', 'stressed', 'fearful',
  ],
  overwhelmed: [
    'overwhelmed', 'overwhelm', 'swamped', 'exhausted', 'drained', 'burnt',
    'burnout', 'too much', 'flooded', 'frantic', 'rushed', 'stretched',
  ],
  confident: [
    'confident', 'confidence', 'capable', 'assured', 'competent', 'prepared',
    'ready', 'steady', 'in control', 'reassured',
  ],
  proud: [
    'proud', 'pride', 'accomplished', 'achieved', 'satisfied', 'fulfilled',
    'pleased', 'rewarding', 'grateful',
  ],
  uncertain: [
    'unsure', 'uncertain', 'confused', 'doubt', 'hesitant', 'lost', 'unclear',
    'questioned', 'second-guessed',
  ],
  sad: [
    'sad', 'upset', 'down', 'disappointed', 'heartbroken', 'grief', 'tearful',
    'low', 'deflated',
  ],
  calm: [
    'calm', 'relaxed', 'settled', 'composed', 'peaceful', 'grounded', 'okay',
  ],
}

// Simple positive/negative sentiment terms (open-licence style word list).
export const POSITIVE_WORDS = new Set([
  'good', 'great', 'positive', 'well', 'better', 'success', 'successful',
  'improved', 'helped', 'kind', 'supported', 'supportive', 'clear', 'effective',
  'safe', 'calm', 'confident', 'proud', 'grateful', 'rewarding',
])

export const NEGATIVE_WORDS = new Set([
  'bad', 'difficult', 'hard', 'struggle', 'struggled', 'failed', 'mistake',
  'wrong', 'unsafe', 'poor', 'confusing', 'overwhelmed', 'anxious', 'stressed',
  'scared', 'worried', 'upset', 'unclear', 'rushed',
])

// Common clinical/topic keywords to surface as topic suggestions.
export const TOPIC_KEYWORDS: Record<string, string[]> = {
  'medication-safety': ['medication', 'med', 'meds', 'drug', 'dose', 'dosage', 'administration', 'prescription'],
  communication: ['communication', 'handover', 'explained', 'listened', 'rapport', 'conversation', 'talked'],
  assessment: ['assessment', 'observation', 'vitals', 'obs', 'examined', 'monitored', 'baseline'],
  'patient-safety': ['safety', 'risk', 'fall', 'falls', 'incident', 'pressure', 'infection', 'hygiene'],
  teamwork: ['team', 'colleague', 'nurse', 'doctor', 'supervisor', 'preceptor', 'collaborate'],
  documentation: ['documentation', 'charting', 'notes', 'recorded', 'paperwork'],
  'end-of-life': ['palliative', 'dying', 'death', 'bereavement', 'comfort', 'end-of-life'],
  'wound-care': ['wound', 'dressing', 'sutures', 'healing', 'pressure-injury'],
}

// Common English stop words to drop from keyword extraction.
export const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'i', 'me', 'my', 'we', 'our', 'you',
  'it', 'is', 'was', 'were', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
  'this', 'that', 'they', 'them', 'he', 'she', 'his', 'her', 'as', 'so', 'if',
  'then', 'than', 'had', 'has', 'have', 'be', 'been', 'being', 'do', 'did',
  'not', 'no', 'up', 'out', 'about', 'into', 'over', 'after', 'today', 'when',
  'what', 'which', 'who', 'how', 'why', 'because', 'from', 'all', 'would',
  'could', 'should', 'felt', 'feel', 'was', 'very', 'really', 'just', 'more',
])
