import { useState } from 'react'
import { Clock, Dumbbell, Pencil, Plus, Shapes, Trash2, Users, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { WEEKDAYS, WEEKDAYS_SHORT, addMinutes, euro, fromCents, hhmm, openGymLabel, schedulesLabel, toCents } from '../lib/format'
import { Badge, Button, Card, Checkbox, Empty, ErrorBanner, Field, Input, Loading, Modal, PageHeader, Select, Textarea, cx, useLoad } from '../components/ui'

export default function Courses() {
  const { terms, type, can } = useAuth()
  const canWrite = can('courses:write')
  const courses = useLoad(() => api.get('/api/courses'), [])
  const staff = useLoad(() => (can('staff:read') ? api.get('/api/staff') : Promise.resolve([])), [])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)

  async function remove(c) {
    if (!confirm(`Eliminare "${c.name}"? Verranno eliminate anche le relative prenotazioni.`)) return
    try {
      await api.del(`/api/courses/${c.id}`)
      courses.reload()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <PageHeader
        title={terms.courses}
        subtitle={type === 'medico' ? 'Ogni slot è un appuntamento singolo, a pagamento per visita.' : 'Capienza, giorni e orari di ogni corso.'}
        actions={canWrite && (
          <Button onClick={() => setEditing({})}>
            <Plus className="size-4" /> Nuov{type === 'medico' ? 'a prestazione' : 'o corso'}
          </Button>
        )}
      />
      <ErrorBanner error={error || courses.error} onClose={() => setError(null)} />
      {courses.loading ? (
        <Loading />
      ) : courses.data?.length === 0 ? (
        <Card>
          <Empty icon={Shapes} title={`Nessun${type === 'medico' ? 'a prestazione' : ' corso'}`}>
            {canWrite && 'Crea il primo per iniziare a ricevere prenotazioni.'}
          </Empty>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.data?.map((c) => (
            <Card key={c.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg leading-tight flex items-center gap-2">
                  {c.kind === 'open_gym' && <Dumbbell className="size-4 text-accent" />}{c.name}
                </h3>
                <span className="flex gap-1">
                  {c.kind === 'open_gym' && <Badge tone="accent">Open Gym</Badge>}
                  {!c.active && <Badge>Non attivo</Badge>}
                </span>
              </div>
              {c.staffName && <p className="text-sm text-muted mt-0.5">{c.staffName}</p>}
              <div className="mt-4 space-y-1.5 text-sm flex-1">
                <p className="flex items-center gap-2"><Clock className="size-4 text-muted shrink-0" />{c.kind === 'open_gym' ? openGymLabel(c.schedules, c.durationMin) : schedulesLabel(c.schedules)}</p>
                {type !== 'medico' && <p className="flex items-center gap-2"><Users className="size-4 text-muted" />{c.kind === 'open_gym' ? `${c.capacity} persone per fascia` : `Capienza ${c.capacity}`}</p>}
                <p className="text-muted">
                  {c.durationMin} min · {type === 'medico' ? `${euro(c.priceCents)} a visita` : euro(c.priceCents)}
                </p>
                {c.note && <p className="text-muted text-xs pt-1">{c.note}</p>}
              </div>
              {canWrite && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-line">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(c)}><Pencil className="size-3.5" /> Modifica</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(c)}><Trash2 className="size-3.5" /> Elimina</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <CourseForm
          course={editing}
          staff={staff.data || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            courses.reload()
          }}
        />
      )}
    </>
  )
}

function CourseForm({ course, staff, onClose, onSaved }) {
  const { terms, type, can } = useAuth()
  const isNew = !course.id
  const [form, setForm] = useState({
    kind: course.kind || 'corso',
    name: course.name || '',
    staffId: course.staffId || '',
    capacity: course.capacity ?? (type === 'medico' ? 1 : 10),
    price: fromCents(course.priceCents ?? 0),
    durationMin: course.durationMin ?? 60,
    note: course.note || '',
    active: course.active ?? true,
    schedules: (course.schedules || []).map((s) => ({ weekday: s.weekday, startTime: hhmm(s.startTime), durationMin: s.durationMin ?? null })),
  })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const openGym = form.kind === 'open_gym'

  function chooseKind(kind) {
    if (kind === form.kind) return
    if (kind === 'open_gym' && isNew) {
      // Default dell'Open Gym: tutti i giorni dalle 06:00 a mezzanotte, fasce da 2 ore (06–08, 08–10, … 22–24).
      setForm({ ...form, kind, name: form.name || 'Open Gym', staffId: '', capacity: 20, durationMin: 120,
        schedules: generateSlots([0, 1, 2, 3, 4, 5, 6], '06:00', '00:00', 120) })
    } else {
      setForm({ ...form, kind })
    }
  }

  function setSchedule(i, patch) {
    setForm({ ...form, schedules: form.schedules.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const body = {
      kind: form.kind,
      name: form.name,
      staffId: form.staffId || null,
      capacity: Number(form.capacity),
      priceCents: toCents(form.price) ?? 0,
      durationMin: Number(form.durationMin),
      note: form.note,
      active: form.active,
      schedules: form.schedules.filter((s) => s.startTime).map((s) => ({ weekday: Number(s.weekday), startTime: s.startTime, durationMin: s.durationMin ?? null })),
    }
    try {
      if (isNew) await api.post('/api/courses', body)
      else await api.put(`/api/courses/${course.id}`, body)
      onSaved()
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      wide
      title={openGym ? (isNew ? 'Nuovo Open Gym' : 'Modifica Open Gym') : isNew ? `Nuov${type === 'medico' ? 'a' : 'o'} ${terms.course.toLowerCase()}` : `Modifica ${terms.course.toLowerCase()}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button type="submit" form="course-form" disabled={busy}>Salva</Button>
        </>
      }
    >
      <ErrorBanner error={error} />
      <form id="course-form" onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        {type === 'palestra' && (
          <div className="sm:col-span-2">
            <p className="text-sm font-medium mb-2">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              {[['corso', 'Corso', 'Lezione con orari e istruttore'], ['open_gym', 'Open Gym', 'Allenamento libero a fasce orarie']].map(([k, label, desc]) => (
                <button key={k} type="button" onClick={() => chooseKind(k)}
                  className={cx('rounded-card border p-3 text-left transition', form.kind === k ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/50')}>
                  <span className="font-medium block">{label}</span>
                  <span className="text-xs text-muted">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <Field label="Nome" className="sm:col-span-2">
          <Input required value={form.name} onChange={set('name')} />
        </Field>
        {can('staff:read') && !openGym && (
          <Field label={terms.staffMember}>
            <Select value={form.staffId} onChange={set('staffId')}>
              <option value="">— Nessuno —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.roleLabel ? ` (${s.roleLabel})` : ''}</option>
              ))}
            </Select>
          </Field>
        )}
        {type === 'medico' ? (
          <Field label="Capienza" hint="Nello studio ogni slot è un appuntamento per una sola persona.">
            <Input value={1} disabled />
          </Field>
        ) : (
          <Field label={openGym ? 'Persone per fascia oraria' : 'Capienza per slot'}>
            <Input type="number" min={1} max={500} required value={form.capacity} onChange={set('capacity')} />
          </Field>
        )}
        <Field label={type === 'medico' ? 'Costo a visita (€)' : 'Prezzo (€)'}>
          <Input inputMode="decimal" value={form.price} onChange={set('price')} />
        </Field>
        <Field label={openGym ? 'Durata di ogni fascia (minuti)' : 'Durata (minuti)'}>
          <Input type="number" min={1} max={1440} required value={form.durationMin} onChange={set('durationMin')} />
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <Textarea value={form.note} onChange={set('note')} />
        </Field>

        <SlotPlanner
          key={form.kind}
          schedules={form.schedules}
          durationMin={Number(form.durationMin) || 60}
          openGym={openGym}
          noun={type === 'medico' ? 'appuntamenti' : 'fasce'}
          onChange={(schedules) => setForm({ ...form, schedules })}
        />

        <div className="sm:col-span-2">
          <Checkbox label="Attivo (prenotabile)" checked={form.active} onChange={set('active')} />
        </div>
      </form>
    </Modal>
  )
}

/**
 * Fasce consecutive di `step` minuti tra `from` e `to` ("00:00" come fine = mezzanotte).
 * Se c'è `lastFrom`, da quell'ora fino a `to` si crea un'unica fascia finale (es. 22:00–24:00).
 */
function generateSlots(days, from, to, step, lastFrom) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  const start = toMin(from)
  let end = toMin(to)
  if (end <= start) end += 24 * 60
  end = Math.min(end, 24 * 60)
  let last = lastFrom ? toMin(lastFrom) : null
  if (last !== null && (last <= start || last >= end)) last = null
  const out = []
  for (const weekday of days) {
    const stop = last ?? end
    for (let t = start; t + step <= stop; t += step) out.push({ weekday, startTime: fmt(t), durationMin: null })
    if (last !== null) out.push({ weekday, startTime: fmt(last), durationMin: end - last })
  }
  return out
}

/**
 * Fasce orarie del corso: si scelgono i giorni e l'intervallo, e le fasce vengono generate in base
 * alla durata in minuti (es. 09:00–13:00 con 30 min → 8 fasce). Si possono aggiungere o togliere
 * singole fasce. Vale per tutti i tipi di corso; l'"ultima fascia" più lunga solo per l'Open Gym.
 */
function SlotPlanner({ schedules, durationMin, openGym, noun, onChange }) {
  const [days, setDays] = useState(new Set(openGym ? [0, 1, 2, 3, 4, 5, 6] : []))
  const [from, setFrom] = useState(openGym ? '06:00' : '09:00')
  const [to, setTo] = useState(openGym ? '00:00' : '13:00')
  const [lastFrom, setLastFrom] = useState('')
  const [single, setSingle] = useState({ weekday: 0, startTime: '' })

  function toggleDay(d) {
    const next = new Set(days)
    next.has(d) ? next.delete(d) : next.add(d)
    setDays(next)
  }

  function generate() {
    const kept = schedules.filter((s) => !days.has(Number(s.weekday)))
    onChange([...kept, ...generateSlots([...days].sort(), from, to, durationMin, openGym ? lastFrom : '')])
  }

  function addSingle() {
    if (!single.startTime) return
    const exists = schedules.some((s) => Number(s.weekday) === Number(single.weekday) && s.startTime === single.startTime)
    if (!exists) onChange([...schedules, { weekday: Number(single.weekday), startTime: single.startTime, durationMin: null }])
    setSingle({ ...single, startTime: '' })
  }

  const byDay = WEEKDAYS.map((_, d) => schedules.filter((s) => Number(s.weekday) === d).sort((a, b) => a.startTime.localeCompare(b.startTime)))
  // Le fasce dello stesso giorno non possono sovrapporsi (dopo 06–08 viene 08–10, non 07–09).
  const overlapDays = byDay
    .map((list, d) => (list.some((s, i) => i > 0 && s.startTime < addMinutes(list[i - 1].startTime, list[i - 1].durationMin ?? durationMin)) ? d : null))
    .filter((d) => d !== null)

  return (
    <div className="sm:col-span-2 space-y-4">
      <div className="rounded-card border border-dashed border-line p-4 space-y-3">
        <p className="text-sm font-medium">Genera {openGym ? 'le fasce orarie' : `gli orari (${noun})`}</p>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS_SHORT.map((d, i) => (
            <button key={i} type="button" aria-pressed={days.has(i)} onClick={() => toggleDay(i)}
              className={cx('rounded-full border px-3 py-1 text-sm', days.has(i) ? 'border-accent bg-accent text-on-accent' : 'border-line text-muted hover:border-accent/50')}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Dalle"><Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="w-32" /></Field>
          <Field label="Alle" hint="00:00 = mezzanotte"><Input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="w-32" /></Field>
          {openGym && (
            <Field label="Ultima fascia dalle" hint="Facoltativo: unica fascia fino alla chiusura"><Input type="time" value={lastFrom} onChange={(e) => setLastFrom(e.target.value)} className="w-32" /></Field>
          )}
          <Button variant="secondary" onClick={generate} disabled={days.size === 0}>Genera</Button>
        </div>
        <p className="text-xs text-muted">
          {days.size === 0
            ? 'Seleziona i giorni, poi premi Genera.'
            : `Crea ${noun === 'appuntamenti' ? 'un appuntamento' : 'una fascia'} ogni ${durationMin} minuti nei giorni selezionati${openGym && lastFrom ? `, con un'unica fascia finale dalle ${lastFrom} alla chiusura` : ''}, sostituendo quelli già presenti in quei giorni.`}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{openGym ? 'Fasce prenotabili' : 'Orari prenotabili'}</p>
        {overlapDays.length > 0 && (
          <p className="rounded-card bg-danger-soft text-danger px-3 py-2 text-sm">
            Orari sovrapposti ({overlapDays.map((d) => WEEKDAYS_SHORT[d]).join(', ')}): ognuno deve iniziare quando finisce il precedente.
            Se hai cambiato la durata, premi <strong>Genera</strong> per ricrearli.
          </p>
        )}
        {schedules.length === 0 && (
          <p className="text-sm text-muted">Nessun orario: finché non ne aggiungi, non si potrà prenotare.</p>
        )}
        {byDay.map((list, d) => (
          <div key={d} className="flex gap-3 items-start">
            <span className="w-10 text-sm text-muted pt-1">{WEEKDAYS_SHORT[d]}</span>
            {list.length === 0 ? (
              <span className="text-sm text-muted pt-1">{openGym ? 'Chiuso' : '—'}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5 flex-1">
                {list.map((s) => (
                  <span key={s.startTime} className="inline-flex items-center gap-1 rounded-full bg-surface-2 border border-line pl-2.5 pr-1 py-0.5 text-xs">
                    {s.startTime}–{addMinutes(s.startTime, s.durationMin ?? durationMin)}
                    <button type="button" aria-label="Rimuovi" className="rounded-full p-0.5 hover:bg-line"
                      onClick={() => onChange(schedules.filter((x) => !(Number(x.weekday) === d && x.startTime === s.startTime)))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Aggiungi un singolo orario">
          <Select value={single.weekday} onChange={(e) => setSingle({ ...single, weekday: Number(e.target.value) })} className="w-40">
            {WEEKDAYS.map((d, n) => <option key={n} value={n}>{d}</option>)}
          </Select>
        </Field>
        <Input type="time" aria-label="Ora di inizio" value={single.startTime} onChange={(e) => setSingle({ ...single, startTime: e.target.value })} className="w-32" />
        <Button variant="secondary" onClick={addSingle} disabled={!single.startTime}><Plus className="size-3.5" /> Aggiungi</Button>
      </div>
    </div>
  )
}
