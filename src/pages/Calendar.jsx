import { useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Dumbbell, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { addDays, addMinutes, fmtDate, fmtDay, hhmm, isoDate, startOfWeek, today, weekdayOf } from '../lib/format'
import { Badge, Button, Card, Checkbox, ErrorBanner, Field, Loading, MailButton, Modal, PageHeader, Select, cx, useLoad } from '../components/ui'

export default function Calendar() {
  const { terms, type, can } = useAuth()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today()))
  const [courseFilter, setCourseFilter] = useState('')
  const [openGroup, setOpenGroup] = useState(null)
  const from = isoDate(weekStart)
  const to = isoDate(addDays(weekStart, 6))

  const courses = useLoad(() => (can('courses:read') ? api.get('/api/courses') : Promise.resolve([])), [])
  const bookings = useLoad(
    () => api.get(`/api/bookings?from=${from}&to=${to}${courseFilter ? `&courseId=${courseFilter}` : ''}`),
    [from, to, courseFilter],
  )

  // Slot della settimana: dagli orari dei corsi + eventuali prenotazioni fuori orario.
  const days = useMemo(() => {
    const out = []
    const courseList = (courses.data || []).filter((c) => !courseFilter || c.id === courseFilter)
    const byCourse = Object.fromEntries((courses.data || []).map((c) => [c.id, c]))
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i)
      const iso = isoDate(date)
      const slots = new Map()
      for (const c of courseList) {
        if (!c.active) continue
        for (const s of c.schedules) {
          if (s.weekday !== weekdayOf(date)) continue
          const key = `${c.id}|${hhmm(s.startTime)}`
          slots.set(key, { key, date: iso, time: hhmm(s.startTime), durationMin: s.durationMin ?? c.durationMin, course: c, bookings: [] })
        }
      }
      for (const b of bookings.data || []) {
        if (b.date !== iso) continue
        const key = `${b.courseId}|${hhmm(b.startTime)}`
        if (!slots.has(key)) {
          const c = byCourse[b.courseId] || { id: b.courseId, name: b.courseName, capacity: 1 }
          slots.set(key, { key, date: iso, time: hhmm(b.startTime), durationMin: b.durationMin, course: c, bookings: [] })
        }
        slots.get(key).bookings.push(b)
      }
      // Riepilogo del giorno: una riga per corso, con le sue fasce dentro.
      const groups = new Map()
      for (const sl of [...slots.values()].sort((a, b) => a.time.localeCompare(b.time))) {
        if (!groups.has(sl.course.id)) groups.set(sl.course.id, { key: `${iso}|${sl.course.id}`, date: iso, course: sl.course, slots: [] })
        groups.get(sl.course.id).slots.push(sl)
      }
      out.push({ iso, groups: [...groups.values()] })
    }
    return out
  }, [courses.data, bookings.data, weekStart, courseFilter])

  // Open Gym: quante volte si è prenotato ogni iscritto nel mese (la settimana può stare a cavallo di due mesi).
  const hasOpenGym = (courses.data || []).some((c) => c.kind === 'open_gym')
  const months = [...new Set([from.slice(0, 7), to.slice(0, 7)])]
  const monthly = useLoad(
    () => (hasOpenGym ? Promise.all(months.map((m) => api.get(`/api/bookings/open-gym/monthly?month=${m}`))) : Promise.resolve([])),
    [hasOpenGym, from, to, bookings.data],
  )
  const monthlyCount = useMemo(() => {
    const map = {}
    ;(monthly.data || []).forEach((rows, i) => rows.forEach((r) => { map[`${months[i]}|${r.memberId}`] = r.bookings }))
    return (date, memberId) => map[`${date.slice(0, 7)}|${memberId}`] || 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthly.data])

  const todayIso = isoDate(today())
  const current = openGroup && days.flatMap((d) => d.groups).find((g) => g.key === openGroup)

  return (
    <>
      <PageHeader
        title={terms.calendar}
        subtitle={`${fmtDate(from, { day: 'numeric', month: 'long' })} – ${fmtDate(to, { day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <>
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-auto">
              <option value="">{terms.allCourses}</option>
              {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Settimana precedente"><ChevronLeft className="size-4" /></Button>
            <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(today()))}>Oggi</Button>
            <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Settimana successiva"><ChevronRight className="size-4" /></Button>
          </>
        }
      />
      <ErrorBanner error={bookings.error || courses.error} />
      {bookings.loading && !bookings.data ? (
        <Loading />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {days.map((d) => (
            <Card key={d.iso} className={cx('p-4', d.iso === todayIso && 'border-accent')}>
              <p className={cx('text-sm font-semibold capitalize mb-3', d.iso === todayIso && 'text-accent')}>{fmtDay(d.iso)}</p>
              {d.groups.length === 0 ? (
                <p className="text-sm text-muted">Nessun{type === 'medico' ? ' appuntamento' : ' corso'}</p>
              ) : (
                <ul className="space-y-2">
                  {d.groups.map((g) => {
                    const booked = g.slots.reduce((a, s) => a + s.bookings.length, 0)
                    const capacity = g.slots.reduce((a, s) => a + (s.course.capacity || 1), 0)
                    const first = g.slots[0]
                    const last = g.slots[g.slots.length - 1]
                    const og = g.course.kind === 'open_gym'
                    return (
                      <li key={g.key}>
                        <button
                          onClick={() => setOpenGroup(g.key)}
                          className="w-full text-left rounded-card bg-surface-2 hover:ring-1 hover:ring-accent/50 px-3 py-2 flex items-center gap-3"
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">
                              {og && <Dumbbell className="size-3.5 inline mr-1 text-accent" />}{g.course.name}
                            </span>
                            <span className="block text-xs text-muted truncate">
                              {g.slots.length === 1
                                ? first.time
                                : `${g.slots.length} ${og ? 'fasce' : 'orari'} · ${first.time}–${addMinutes(last.time, last.durationMin)}`}
                            </span>
                          </span>
                          <Badge tone={booked >= capacity ? 'danger' : booked ? 'accent' : 'neutral'}>
                            {type === 'medico' ? `${booked}/${capacity} prenotati` : `${booked} ${booked === 1 ? 'iscritto' : 'iscritti'}`}
                          </Badge>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
      {current && (
        <CourseDayModal
          group={current}
          monthlyCount={current.course.kind === 'open_gym' ? (memberId) => monthlyCount(current.date, memberId) : null}
          onClose={() => setOpenGroup(null)}
          onChanged={bookings.reload}
        />
      )}
    </>
  )
}

/** Le fasce di un corso in un giorno; cliccando una fascia si vedono e gestiscono gli iscritti. */
function CourseDayModal({ group, monthlyCount, onClose, onChanged }) {
  const { type } = useAuth()
  const single = group.slots.length === 1
  const [time, setTime] = useState(single ? group.slots[0].time : null)
  const slot = time && group.slots.find((s) => s.time === time)
  const og = group.course.kind === 'open_gym'
  const range = (s) => `${s.time}–${addMinutes(s.time, s.durationMin)}`

  return (
    <Modal open title={`${group.course.name} · ${fmtDay(group.date)}${slot ? ` · ${og ? range(slot) : slot.time}` : ''}`} onClose={onClose}>
      {slot ? (
        <>
          {!single && (
            <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => setTime(null)}>
              <ArrowLeft className="size-4" /> Tutte le fasce
            </Button>
          )}
          <SlotDetail slot={slot} monthlyCount={monthlyCount} onChanged={onChanged} />
        </>
      ) : (
        <>
          <p className="text-sm text-muted mb-3">Scegli {og ? 'la fascia' : "l'orario"} per vedere, aggiungere o togliere {type === 'medico' ? 'il paziente' : 'gli iscritti'}.</p>
          <ul className="space-y-2">
            {group.slots.map((s) => {
              const n = s.bookings.length
              const cap = s.course.capacity || 1
              return (
                <li key={s.key}>
                  <button onClick={() => setTime(s.time)}
                    className="w-full text-left rounded-card bg-surface-2 hover:ring-1 hover:ring-accent/50 px-3 py-2 flex items-center gap-3">
                    <span className="font-mono text-sm shrink-0">{og ? range(s) : s.time}</span>
                    <span className="flex-1 min-w-0 text-xs text-muted truncate">{s.bookings.map((b) => b.memberName).join(', ')}</span>
                    <Badge tone={n >= cap ? 'danger' : n ? 'accent' : 'neutral'}>
                      {type === 'medico' ? (n ? 'Prenotato' : 'Libero') : `${n}/${cap}`}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Modal>
  )
}

function SlotDetail({ slot, monthlyCount, onChanged }) {
  const { terms, type, can } = useAuth()
  const canWrite = can('bookings:write')
  const members = useLoad(() => (canWrite && can('members:read') ? api.get('/api/members') : Promise.resolve([])), [])
  const [memberId, setMemberId] = useState('')
  const [error, setError] = useState(null)
  const full = slot.bookings.length >= slot.course.capacity
  const bookedIds = new Set(slot.bookings.map((b) => b.memberId))
  // L'operatore può aggiungere chi si è dimenticato di prenotarsi fino a 31 giorni fa.
  const tooOld = slot.date < isoDate(addDays(today(), -31))
  const started = new Date(`${slot.date}T${slot.time}`) < new Date()

  async function add() {
    setError(null)
    try {
      await api.post('/api/bookings', { courseId: slot.course.id, date: slot.date, startTime: slot.time, memberId })
      setMemberId('')
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  async function cancel(b) {
    if (!confirm(`Annullare ${terms.booking.toLowerCase()} di ${b.memberName}?`)) return
    try {
      await api.del(`/api/bookings/${b.id}`)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  async function presence(b, present) {
    try {
      await api.put(`/api/bookings/${b.id}/present`, { present })
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const memberById = Object.fromEntries((members.data || []).map((m) => [m.id, m]))

  return (
    <>
      <ErrorBanner error={error} onClose={() => setError(null)} />
      <p className="text-sm text-muted mb-4">
        {type === 'medico' ? 'Appuntamento singolo' : `${slot.bookings.length} su ${slot.course.capacity} posti occupati`}
      </p>
      {slot.bookings.length === 0 ? (
        <p className="text-sm mb-4">Nessuna prenotazione.</p>
      ) : (
        <ul className="divide-y divide-line mb-4">
          {slot.bookings.map((b) => (
            <li key={b.id} className="py-2 flex items-center gap-3">
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{b.memberName}</span>
                {monthlyCount && <span className="block text-xs text-muted">{monthlyCount(b.memberId)} prenotazioni Open Gym in {fmtDate(slot.date, { month: 'long' })}</span>}
              </span>
              <MailButton email={memberById[b.memberId]?.email} />
              {canWrite && <Checkbox label="Presente" checked={Boolean(b.present)} onChange={(e) => presence(b, e.target.checked)} />}
              {canWrite && (
                <Button variant="ghost" size="sm" onClick={() => cancel(b)} aria-label="Annulla prenotazione"><Trash2 className="size-4" /></Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canWrite && can('members:read') && !full && !tooOld && (
        <div className="pt-3 border-t border-line">
        {started && <p className="text-xs text-muted mb-2">Fascia già iniziata: chi aggiungi ora viene segnato come presente.</p>}
        <div className="flex gap-2 items-end">
          <Field label={`Aggiungi ${terms.member.toLowerCase()}`} className="flex-1">
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Seleziona…</option>
              {members.data?.filter((m) => m.active && !bookedIds.has(m.id)).map((m) => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </Select>
          </Field>
          <Button onClick={add} disabled={!memberId}>{started ? 'Aggiungi' : 'Prenota'}</Button>
        </div>
        </div>
      )}
    </>
  )
}

