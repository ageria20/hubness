import { useMemo, useState } from 'react'
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Download, Dumbbell, Info, Lock, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api, downloadFile } from '../lib/api'
import { addDays, addMinutes, daysUntil, euro, fmtDate, fmtDay, hhmm, isoDate, openGymLabel, schedulesLabel, today } from '../lib/format'
import { Badge, Button, Card, Empty, ErrorBanner, ExpiryBadge, Field, Input, Loading, MailButton, PageHeader, Tabs, cx, useLoad } from '../components/ui'

export default function ClientView() {
  const { me, tenant, terms, type } = useAuth()
  const [tab, setTab] = useState('book')
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  return (
    <>
      <PageHeader title={`Ciao ${me.fullName.split(' ')[0]}`} subtitle={tenant.name} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'book', label: terms.book },
          { value: 'mine', label: type === 'medico' ? 'I miei appuntamenti' : 'Le mie prenotazioni' },
          { value: 'profile', label: 'Il mio profilo' },
        ]}
      />
      {tab === 'book' && <BookTab version={version} onChanged={bump} />}
      {tab === 'mine' && <MineTab version={version} onChanged={bump} />}
      {tab === 'profile' && <ProfileTab />}
    </>
  )
}

function BookTab({ version, onChanged }) {
  const { terms, type, usesSubscriptions } = useAuth()
  const courses = useLoad(() => api.get('/api/courses'), [])
  const [selectedId, setSelectedId] = useState(null)
  // L'Open Gym (allenamento libero) compare in cima, prima dei corsi.
  const list = [...(courses.data || [])].sort((a, b) => (a.kind === 'open_gym' ? 0 : 1) - (b.kind === 'open_gym' ? 0 : 1))
  const selected = list.find((c) => c.id === selectedId) || null

  if (courses.loading) return <Loading />
  if (courses.error) return <ErrorBanner error={courses.error} />
  if (list.length === 0) return <Card><Empty title={`Nessun${type === 'medico' ? 'a prestazione disponibile' : ' corso disponibile'}`} /></Card>

  return (
    <div className="grid lg:grid-cols-[minmax(0,18rem)_1fr] gap-6">
      <div className="space-y-2">
        <p className="text-sm text-muted mb-1">Scegli {type === 'medico' ? 'la prestazione' : 'il corso'}</p>
        {list.map((c) => {
          const locked = usesSubscriptions && c.eligible === false
          return (
            <button
              key={c.id}
              disabled={locked}
              onClick={() => setSelectedId(c.id)}
              className={cx(
                'w-full text-left rounded-card border p-3 transition',
                selectedId === c.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/50',
                locked && 'opacity-60 cursor-not-allowed hover:border-line',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium flex items-center gap-2">
                  {c.kind === 'open_gym' && <Dumbbell className="size-4 text-accent" />}{c.name}
                </span>
                {locked && <Lock className="size-4 text-muted" />}
              </span>
              <span className="block text-xs text-muted mt-0.5">
                {c.kind === 'open_gym' ? (
                  <>Allenamento libero · {openGymLabel(c.schedules, c.durationMin)}</>
                ) : (
                  <>
                    {c.staffName ? `${c.staffName} · ` : ''}
                    {type === 'medico' ? `${c.durationMin} min · ${euro(c.priceCents)} a visita` : schedulesLabel(c.schedules)}
                  </>
                )}
              </span>
              {locked && <span className="block text-xs text-muted mt-1">Non incluso nel tuo {terms.subscription.toLowerCase()}</span>}
            </button>
          )
        })}
      </div>
      <div>
        {selected ? (
          <Slots course={selected} version={version} onChanged={onChanged} />
        ) : (
          <Card><Empty icon={CalendarCheck} title="Seleziona per vedere le disponibilità" /></Card>
        )}
      </div>
    </div>
  )
}

function Slots({ course, version, onChanged }) {
  const { type } = useAuth()
  const openGym = course.kind === 'open_gym'
  const slotLabel = (s) => (openGym ? `${hhmm(s.startTime)}–${addMinutes(s.startTime, s.durationMin ?? course.durationMin)}` : hhmm(s.startTime))
  const [offset, setOffset] = useState(0)
  const from = isoDate(addDays(today(), offset))
  const to = isoDate(addDays(today(), offset + 13))
  const slots = useLoad(() => api.get(`/api/courses/${course.id}/availability?from=${from}&to=${to}`), [course.id, from, to, version])
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const mine = useLoad(() => api.get('/api/bookings/mine'), [version])

  const byDay = useMemo(() => {
    const groups = new Map()
    for (const s of slots.data || []) {
      if (s.past) continue
      // Nello studio medico si vedono solo gli slot liberi (e i propri).
      if (type === 'medico' && s.free === 0 && !s.mine) continue
      if (!groups.has(s.date)) groups.set(s.date, [])
      groups.get(s.date).push(s)
    }
    return [...groups.entries()]
  }, [slots.data, type])

  async function book(s) {
    setBusy(s.date + s.startTime)
    setError(null)
    try {
      await api.post('/api/bookings', { courseId: course.id, date: s.date, startTime: hhmm(s.startTime) })
      setDone(`${fmtDay(s.date)} ${openGym ? `dalle ${hhmm(s.startTime)} alle ${addMinutes(s.startTime, s.durationMin ?? course.durationMin)}` : `alle ${hhmm(s.startTime)}`}`)
      onChanged()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  async function cancel(s) {
    const b = mine.data?.find((x) => x.courseId === course.id && x.date === s.date && hhmm(x.startTime) === hhmm(s.startTime))
    if (!b || !confirm('Annullare la prenotazione?')) return
    setError(null)
    try {
      await api.del(`/api/bookings/${b.id}`)
      setDone(null)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-lg">{course.name}</h2>
          {openGym && <p className="text-sm text-muted">Allenamento libero, fuori dai corsi</p>}
          <p className="text-sm text-muted">{fmtDate(from, { day: 'numeric', month: 'short' })} – {fmtDate(to, { day: 'numeric', month: 'short' })}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 14))} aria-label="Precedenti"><ChevronLeft className="size-4" /></Button>
          <Button variant="secondary" size="sm" disabled={offset >= 42} onClick={() => setOffset(offset + 14)} aria-label="Successivi"><ChevronRight className="size-4" /></Button>
        </div>
      </div>
      <ErrorBanner error={error || slots.error} onClose={() => setError(null)} />
      {done && (
        <div className="mb-4 rounded-card bg-ok-soft text-ok px-3 py-2 text-sm flex items-center gap-2">
          <Check className="size-4" /> Prenotato: {done}
        </div>
      )}
      {slots.loading && !slots.data ? (
        <Loading />
      ) : byDay.length === 0 ? (
        <Empty title="Nessuna disponibilità in questo periodo" />
      ) : (
        <div className="space-y-4">
          {byDay.map(([date, list]) => (
            <div key={date}>
              <p className="text-sm font-medium capitalize mb-2">{fmtDay(date)}</p>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => {
                  const key = s.date + s.startTime
                  if (s.mine) {
                    return (
                      <button key={key} onClick={() => cancel(s)} title="Annulla prenotazione"
                        className="rounded-card border border-ok bg-ok-soft text-ok px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                        <Check className="size-4" /> {slotLabel(s)}
                      </button>
                    )
                  }
                  return (
                    <button
                      key={key}
                      disabled={s.free === 0 || busy === key}
                      onClick={() => book(s)}
                      className="rounded-card border border-line bg-surface-2 px-3 py-2 text-sm text-left hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-medium block">{slotLabel(s)}</span>
                      {type !== 'medico' && (
                        <span className="text-xs text-muted">{s.free === 0 ? 'Completo' : `${s.free} ${s.free === 1 ? 'posto' : 'posti'}`}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">Tocca un orario per prenotare; tocca un orario già prenotato per annullarlo.</p>
        </div>
      )}
    </Card>
  )
}

function MineTab({ version, onChanged }) {
  const { type } = useAuth()
  const mine = useLoad(() => api.get('/api/bookings/mine'), [version])
  const [error, setError] = useState(null)

  async function cancel(b) {
    if (!confirm(`Annullare ${b.courseName} del ${fmtDay(b.date)} alle ${hhmm(b.startTime)}?`)) return
    try {
      await api.del(`/api/bookings/${b.id}`)
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <Card>
      <ErrorBanner error={error || mine.error} onClose={() => setError(null)} />
      {mine.loading ? (
        <Loading />
      ) : mine.data?.length === 0 ? (
        <Empty icon={CalendarCheck} title={`Nessun${type === 'medico' ? ' appuntamento' : 'a prenotazione'} in programma`} />
      ) : (
        <ul className="divide-y divide-line">
          {mine.data?.map((b) => (
            <li key={b.id} className="px-5 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{b.courseName}</p>
                <p className="text-sm text-muted capitalize">{fmtDay(b.date)} · {hhmm(b.startTime)} · {b.durationMin} min</p>
              </div>
              {type === 'medico' && <span className="text-sm text-muted">{euro(b.priceCents)}</span>}
              <Button variant="ghost" size="sm" onClick={() => cancel(b)}>Annulla</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function ProfileTab() {
  const { me, tenant, terms, type, usesSubscriptions, hasModule } = useAuth()
  const member = useLoad(() => api.get('/api/members/me'), [])
  const courses = useLoad(() => api.get('/api/courses'), [])
  const docs = useLoad(() => (hasModule('documents') && me.memberId ? api.get(`/api/members/${me.memberId}/documents`) : Promise.resolve(null)), [])

  if (member.loading) return <Loading />
  if (member.error) return <ErrorBanner error={member.error} />
  const m = member.data
  const covered = (courses.data || []).filter((c) => m.courseIds.includes(c.id))

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">I miei dati</h2>
        <Row label="Nome">{m.fullName}</Row>
        <Row label="Email">{m.email || '—'}</Row>
        {type !== 'medico' && <Row label="Certificato medico"><ExpiryBadge date={m.certExpiry} days={daysUntil(m.certExpiry)} /></Row>}
        {usesSubscriptions && (
          <>
            <Row label={`${terms.subscription} valido fino al`}><ExpiryBadge date={m.subExpiry} days={daysUntil(m.subExpiry)} /></Row>
            <Row label={`${terms.courses} inclusi`}>
              {covered.length ? (
                <span className="flex flex-wrap gap-1 justify-end">{covered.map((c) => <Badge key={c.id} tone="accent">{c.name}</Badge>)}</span>
              ) : '—'}
            </Row>
          </>
        )}
        {tenant.contactEmail && (
          <div className="pt-3 border-t border-line flex items-center justify-between">
            <span className="text-sm text-muted">Contatta {tenant.name}</span>
            <MailButton email={tenant.contactEmail} />
          </div>
        )}
      </Card>
      {docs.data && <MyDocuments memberId={me.memberId} docs={docs} onChanged={member.reload} />}
    </div>
  )
}

function MyDocuments({ memberId, docs, onChanged }) {
  const { type } = useAuth()
  const withExpiry = type !== 'medico'
  const [form, setForm] = useState({ expiry: '', file: null })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [inputKey, setInputKey] = useState(0)

  async function upload(e) {
    e.preventDefault()
    if (!form.file) return
    const fd = new FormData()
    fd.append('file', form.file)
    fd.append('kind', 'certificato')
    if (withExpiry) fd.append('expiry', form.expiry)
    setBusy(true)
    setError(null)
    try {
      await api.upload(`/api/members/${memberId}/documents`, fd)
      setForm({ expiry: '', file: null })
      setInputKey((k) => k + 1)
      docs.reload()
      onChanged()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove(d) {
    if (!confirm(`Eliminare "${d.name}"?`)) return
    try {
      await api.del(`/api/documents/${d.id}`)
      docs.reload()
      onChanged()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">I miei documenti</h2>
      <ErrorBanner error={error} onClose={() => setError(null)} />
      {docs.data.length === 0 ? (
        <p className="text-sm text-muted">Nessun documento.</p>
      ) : (
        <ul className="divide-y divide-line">
          {docs.data.map((d) => (
            <li key={d.id} className="py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-muted">
                  Caricato il {fmtDate(d.createdAt.slice(0, 10))}
                  {d.deleteAt ? ` · visibile allo studio fino al ${fmtDate(d.deleteAt)}` : ''}
                </p>
              </div>
              {!d.deleteAt && <ExpiryBadge date={d.expiry} days={daysUntil(d.expiry)} />}
              <Button variant="ghost" size="sm" onClick={() => downloadFile(`/api/documents/${d.id}`, d.name).catch(setError)} aria-label="Scarica">
                <Download className="size-4" />
              </Button>
              {d.kind === 'certificato' && d.uploadedByClient && (
                <Button variant="ghost" size="sm" onClick={() => remove(d)} aria-label="Elimina"><Trash2 className="size-4" /></Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={upload} className="mt-4 rounded-card border border-dashed border-line p-4 grid gap-3">
        <p className="text-sm font-medium flex items-center gap-2"><Upload className="size-4" /> Carica il certificato medico</p>
        <Field label="File" hint="PDF o foto, max 10 MB">
          <Input key={inputKey} type="file" required accept=".pdf,.jpg,.jpeg,.png,.heic,.webp" onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })} />
        </Field>
        {withExpiry ? (
          <Field label="Scadenza del certificato *" hint="Inserisci la data di scadenza riportata sul certificato medico.">
            <Input type="date" required min={isoDate(today())} value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
          </Field>
        ) : (
          <p className="flex gap-2 text-xs text-muted">
            <Info className="size-4 shrink-0" />
            Il certificato resta visibile allo studio per 30 giorni dal caricamento, poi viene eliminato automaticamente.
          </p>
        )}
        <div><Button type="submit" disabled={busy || !form.file || (withExpiry && !form.expiry)}>Carica</Button></div>
      </form>
    </Card>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
