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

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
}

export function getReminderChannel(): ReminderChannel {
  if (typeof window === 'undefined') return 'email'
  return (localStorage.getItem(CHANNEL_KEY) as ReminderChannel | null) ?? 'email'
}

export function setReminderChannel(channel: ReminderChannel): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHANNEL_KEY, channel)
}
