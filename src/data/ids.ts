// Stable client-generated UUIDs so a record has the same id locally and on the
// server — essential for local-first sync (the device mints the id, not Postgres).
export function newId(): string {
  return crypto.randomUUID()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nowISO(): string {
  return new Date().toISOString()
}
