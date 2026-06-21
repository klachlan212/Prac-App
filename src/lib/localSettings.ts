// Small UI-only flags live in localStorage, never IndexedDB (CLAUDE.md §4.2).
// These are device preferences with no confidentiality weight. Reminder *channel*
// is kept here for v1; reminder day/time live on the profile (and sync).

import type { ReminderChannel, Theme } from '@/src/data/types'

const THEME_KEY = 'prac.theme'
const CHANNEL_KEY = 'prac.reminderChannel'

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'system'
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}

// v1 is light-only to match the Prac. brand mockups (CLAUDE.md §1). We keep the
// signature so callers (AppShell, settings) don't change, but always render the
// warm light theme — the dark class is never applied. The settings theme control
// is revisited when dark mode returns.
export function applyTheme(_theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove('dark')
}

export function getReminderChannel(): ReminderChannel {
  if (typeof window === 'undefined') return 'email'
  return (localStorage.getItem(CHANNEL_KEY) as ReminderChannel | null) ?? 'email'
}

export function setReminderChannel(channel: ReminderChannel): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHANNEL_KEY, channel)
}
