// Single export seam (CLAUDE.md §3, spec §5.6). All formats go through here so
// future ones (e.g. .docx) slot in without touching callers. Generation is
// fully on-device — the student's own data, initiated by the student.

export type ExportFormat = 'pdf' | 'text'

export interface ExportReflection {
  reflectedOn: string
  body: string
  standards: string[]
  tags: string[]
}

export interface ExportData {
  studentName: string
  university?: string
  program?: string
  ward?: string
  hospital?: string
  startDate?: string
  endDate?: string
  reflections: ExportReflection[]
}

function compact(arr: Array<string | undefined>): string[] {
  return arr.filter((x): x is string => Boolean(x))
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(data: ExportData): string {
  const dateRange = [data.startDate, data.endDate].filter(Boolean).join(' – ')
  const cover = `
    <header class="cover">
      <h1>Clinical Reflections</h1>
      <p class="name">${escapeHtml(data.studentName)}</p>
      <p>${compact([data.university, data.program]).map(escapeHtml).join(' · ')}</p>
      <p>${compact([data.ward, data.hospital]).map(escapeHtml).join(' · ')}</p>
      ${dateRange ? `<p>${escapeHtml(dateRange)}</p>` : ''}
      <p class="count">${data.reflections.length} reflection${data.reflections.length === 1 ? '' : 's'}</p>
    </header>`

  const body = data.reflections
    .map(
      (r) => `
      <article class="reflection">
        <h2>${escapeHtml(r.reflectedOn)}</h2>
        ${r.standards.length ? `<p class="standards">${r.standards.map(escapeHtml).join(' · ')}</p>` : ''}
        <p class="text">${escapeHtml(r.body).replace(/\n/g, '<br/>')}</p>
        ${r.tags.length ? `<p class="tags">${r.tags.map((t) => '#' + escapeHtml(t)).join(' ')}</p>` : ''}
      </article>`
    )
    .join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Clinical Reflections — ${escapeHtml(data.studentName)}</title>
<style>
  @page { margin: 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a202c; line-height: 1.5; }
  .cover { text-align: center; padding: 30mm 0; page-break-after: always; }
  .cover h1 { font-size: 28px; margin-bottom: 16px; }
  .cover .name { font-size: 20px; font-weight: bold; }
  .cover .count { margin-top: 24px; color: #555; }
  .reflection { page-break-inside: avoid; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #ddd; }
  .reflection h2 { font-size: 15px; color: #2b6cb0; margin-bottom: 4px; }
  .standards { font-size: 12px; color: #555; margin-bottom: 8px; }
  .text { white-space: normal; }
  .tags { font-size: 12px; color: #2b6cb0; margin-top: 8px; }
</style></head>
<body>${cover}${body}</body></html>`
}

function buildText(data: ExportData): string {
  const lines: string[] = []
  lines.push('CLINICAL REFLECTIONS')
  lines.push(data.studentName)
  if (data.university || data.program) lines.push([data.university, data.program].filter(Boolean).join(' · '))
  if (data.ward || data.hospital) lines.push([data.ward, data.hospital].filter(Boolean).join(' · '))
  const range = [data.startDate, data.endDate].filter(Boolean).join(' – ')
  if (range) lines.push(range)
  lines.push(`${data.reflections.length} reflection(s)`)
  lines.push('')
  for (const r of data.reflections) {
    lines.push('—'.repeat(40))
    lines.push(r.reflectedOn)
    if (r.standards.length) lines.push(r.standards.join(' · '))
    lines.push('')
    lines.push(r.body)
    if (r.tags.length) lines.push('Tags: ' + r.tags.map((t) => '#' + t).join(' '))
    lines.push('')
  }
  return lines.join('\n')
}

export function exportPlacement(format: ExportFormat, data: ExportData): void {
  if (format === 'text') {
    const blob = new Blob([buildText(data)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prac-reflections-${data.startDate ?? 'placement'}.txt`
    a.click()
    URL.revokeObjectURL(url)
    return
  }

  // PDF: render the printable document in a new window and invoke the browser's
  // print-to-PDF. Works on desktop and mobile without a heavy PDF dependency.
  const win = window.open('', '_blank')
  if (!win) {
    throw new Error('Couldn’t open the print view. Allow pop-ups for this site, or use “Save as text”.')
  }
  win.document.write(buildHtml(data))
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
