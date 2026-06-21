import type { Config } from 'tailwindcss'

// Prac. design tokens (CLAUDE.md §1 brand). Warm, supported, not clinical.
// Light-only for v1 — darkMode kept on 'class' but the class is never applied
// (see src/lib/localSettings.applyTheme), so any leftover `dark:` utilities on
// not-yet-rebuilt screens stay inert rather than reacting to OS preference.
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#f6f4ef',
        surface: '#ffffff',
        ink: { DEFAULT: '#0e2725', soft: '#4a5d5b', faint: '#8aa09d' },
        line: { DEFAULT: '#e7e3da', soft: '#eef0ec' },
        teal: { DEFAULT: '#4ecdc4', deep: '#16857c', bright: '#2fb3aa', ink: '#06302c' },
        sage: { 50: '#eef2e9', 100: '#e3ebdd', 200: '#cdddc6', 300: '#aecaa6' },
        eucalyptus: '#7fa08a',
        // New vs Renewed skill accents
        new: { DEFAULT: '#e3f7f4', ink: '#16857c' },
        renew: { DEFAULT: '#6b7f8c', bg: '#eef2f4' },
        // Identifier-review (confidentiality) accent
        flag: { DEFAULT: '#c97a2b', bg: '#fbeede', line: '#ecd2b0', ink: '#7a4a18' },
        // Reflection-prompt accent
        plum: { DEFAULT: '#7a5c8e', bg: '#f1ebf4', ink: '#4f3a60' },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { field: '14px', card: '18px', xl2: '20px' },
      boxShadow: {
        card: '0 1px 2px rgba(44,58,48,.05), 0 4px 12px rgba(44,58,48,.06)',
        soft: '0 1px 2px rgba(44,58,48,.04), 0 12px 32px rgba(44,58,48,.08)',
        float: '0 18px 50px -22px rgba(14,39,37,.45)',
      },
    },
  },
  plugins: [],
}
export default config
