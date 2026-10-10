// Formattazione e date. Le date sono sempre "locali" (YYYY-MM-DD), mai via toISOString (UTC).

export const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export function euro(cents) {
  if (cents === null || cents === undefined) return '—'
  return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function toCents(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

export function fromCents(cents) {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2)
}

export function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d, n) {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 0 = lunedì ... 6 = domenica (come il backend). */
export function weekdayOf(d) {
  return (d.getDay() + 6) % 7
}

export function startOfWeek(d) {
  return addDays(d, -weekdayOf(d))
}

export function fmtDate(iso, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  if (!iso) return '—'
  return parseDate(iso).toLocaleDateString('it-IT', opts)
}

export function fmtDay(iso) {
  return parseDate(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function hhmm(time) {
  return time ? time.slice(0, 5) : ''
}

/** Giorni da oggi alla data (negativo se passata). */
export function daysUntil(iso) {
  if (!iso) return null
  return Math.round((parseDate(iso) - today()) / 86400000)
}

export function schedulesLabel(schedules) {
  if (!schedules?.length) return 'Nessun orario'
  return schedules.map((s) => `${WEEKDAYS_SHORT[s.weekday]} ${hhmm(s.startTime)}`).join(' · ')
}

/** "HH:MM" + minuti → "HH:MM" (la mezzanotte di fine giornata resta "24:00"). */
export function addMinutes(time, minutes) {
  const [h, m] = hhmm(time).split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Fasce orarie dell'Open Gym riassunte per giorni consecutivi, es. "Lun–Dom 06:00–24:00". */
export function openGymLabel(schedules, durationMin) {
  if (!schedules?.length) return 'Nessun orario'
  const range = {}
  for (const s of schedules) {
    const start = hhmm(s.startTime)
    const end = addMinutes(start, s.durationMin ?? durationMin)
    const r = range[s.weekday]
    range[s.weekday] = r ? [start < r[0] ? start : r[0], end > r[1] ? end : r[1]] : [start, end]
  }
  const parts = []
  let i = 0
  while (i < 7) {
    if (!range[i]) { i++; continue }
    const label = range[i].join('–')
    let j = i
    while (j + 1 < 7 && range[j + 1] && range[j + 1].join('–') === label) j++
    parts.push(`${WEEKDAYS_SHORT[i]}${j > i ? `–${WEEKDAYS_SHORT[j]}` : ''} ${label}`)
    i = j + 1
  }
  return parts.join(' · ')
}
