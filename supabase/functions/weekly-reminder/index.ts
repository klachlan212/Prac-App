// Weekly reminder email (spec §5.4, CLAUDE.md §4.2).
//
// Runs on a schedule (configure a cron trigger in Supabase). For each user with
// reminders enabled, it sends a GENERIC nudge containing NO reflection content —
// only a count of reflections logged this week and a link back into the app.
//
// Deploy:
//   supabase functions deploy weekly-reminder
//   supabase secrets set RESEND_API_KEY=... APP_URL=https://your-app.vercel.app
// Schedule (e.g. weekly) via the Supabase dashboard cron, or:
//   select cron.schedule('weekly-reminder', '0 8 * * 0',
//     $$ select net.http_post(url := '<function-url>', headers := '{}'::jsonb) $$);
//
// This function uses the service-role key and therefore runs ONLY on the server.
// The service-role key is never shipped to the browser (CLAUDE.md §4.1/§4.3).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const APP_URL = Deno.env.get('APP_URL') ?? 'https://example.com'
const FROM = Deno.env.get('REMINDER_FROM') ?? 'Prac <reminders@example.com>'

function startOfWeekISO(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0 = Sunday
  const start = new Date(now)
  start.setUTCDate(now.getUTCDate() - day)
  start.setUTCHours(0, 0, 0, 0)
  return start.toISOString().slice(0, 10)
}

async function sendEmail(to: string, count: number): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[reminder] would email ${to} (count=${count}) — no RESEND_API_KEY set`)
    return
  }
  // Body is deliberately generic: a count and a link, never any content.
  const subject =
    count > 0 ? `You've logged ${count} reflection${count === 1 ? '' : 's'} this week`
              : 'A quick reflection keeps you on track'
  const html = `
    <p>Hi,</p>
    <p>${count > 0
      ? `Nice work — you've logged <strong>${count}</strong> reflection${count === 1 ? '' : 's'} this week.`
      : `You haven't logged a reflection this week yet. A short one takes under a minute.`}</p>
    <p><a href="${APP_URL}/reflections">Open Prac</a></p>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const weekStart = startOfWeekISO()

  // Profiles with reminders not turned off (reminder_day/time are set).
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, reminder_time')
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let sent = 0
  for (const p of profiles ?? []) {
    // Resolve the user's email from the auth record (never stored on profiles).
    const { data: u } = await supabase.auth.admin.getUserById(p.id)
    const email = u.user?.email
    if (!email) continue

    // COUNT ONLY — we never read reflection bodies here.
    const { count } = await supabase
      .from('reflections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.id)
      .is('deleted_at', null)
      .gte('reflected_on', weekStart)

    await sendEmail(email, count ?? 0)
    sent++
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
