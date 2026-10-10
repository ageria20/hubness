import { useState } from 'react'
import { Download, Link2, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api, downloadFile } from '../lib/api'
import { daysUntil, euro, fmtDate, fromCents, schedulesLabel, toCents } from '../lib/format'
import { Badge, Button, Checkbox, CopyField, Empty, ErrorBanner, ExpiryBadge, Field, Input, Loading, MailButton, Modal, Tabs, Textarea, useLoad } from '../components/ui'

export default function MemberDetail({ member, onClose, onChanged, onDeleted }) {
  const { terms, can, usesSubscriptions } = useAuth()
  const isNew = !member.id
  const [tab, setTab] = useState('profile')

  const tabs = [{ value: 'profile', label: 'Anagrafica' }]
  if (!isNew && usesSubscriptions && can('subscriptions:read')) tabs.push({ value: 'subscription', label: terms.subscription })
  if (!isNew && can('documents:read')) tabs.push({ value: 'documents', label: 'Documenti' })
  if (!isNew && can('members:write')) tabs.push({ value: 'access', label: 'Accesso' })

  return (
    <Modal open wide title={isNew ? `Nuova scheda ${terms.member.toLowerCase()}` : member.fullName} onClose={onClose}>
      {tabs.length > 1 && <Tabs tabs={tabs} value={tab} onChange={setTab} />}
      {tab === 'profile' && <ProfileTab member={member} onSaved={onChanged} onDeleted={onDeleted} />}
      {tab === 'subscription' && <SubscriptionTab member={member} onSaved={onChanged} />}
      {tab === 'documents' && <DocumentsTab member={member} />}
      {tab === 'access' && <AccessTab member={member} />}
    </Modal>
  )
}

function ProfileTab({ member, onSaved, onDeleted }) {
  const { can, terms, type } = useAuth()
  const canWrite = can('members:write')
  const [form, setForm] = useState({
    fullName: member.fullName || '',
    email: member.email || '',
    phone: member.phone || '',
    codiceFiscale: member.codiceFiscale || '',
    notes: member.notes || '',
    active: member.active ?? true,
  })
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function save(e) {
    e.preventDefault()
    setError(null)
    const body = { ...form }
    try {
      const m = member.id ? await api.put(`/api/members/${member.id}`, body) : await api.post('/api/members', body)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onSaved(m)
    } catch (err) {
      setError(err)
    }
  }

  async function remove() {
    if (!confirm(`Eliminare definitivamente la scheda di ${member.fullName}, con prenotazioni e documenti?`)) return
    try {
      await api.del(`/api/members/${member.id}`)
      onDeleted()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={save}>
      <ErrorBanner error={error} />
      <fieldset disabled={!canWrite} className="grid sm:grid-cols-2 gap-4">
        <Field label="Nome e cognome" className="sm:col-span-2"><Input required value={form.fullName} onChange={set('fullName')} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Telefono"><Input type="tel" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Codice fiscale" hint="Salvato cifrato."><Input value={form.codiceFiscale} onChange={set('codiceFiscale')} className="uppercase" maxLength={16} /></Field>
        {type !== 'medico' && member.id && (
          <Field label="Scadenza certificato medico" hint={`La indica ${terms.member.toLowerCase()} quando carica il certificato.`}>
            <div className="h-10 flex items-center">
              {member.certExpiry ? <ExpiryBadge date={member.certExpiry} days={daysUntil(member.certExpiry)} /> : <span className="text-sm text-muted">Nessun certificato caricato</span>}
            </div>
          </Field>
        )}
        <Field label="Note / storico" hint={`Facoltativo. Visibile solo allo staff, mai a ${terms.member.toLowerCase()}; salvato cifrato.`} className="sm:col-span-2">
          <Textarea rows={6} value={form.notes} onChange={set('notes')} placeholder="Es. 12/03 – lombalgia acuta, 3 sedute consigliate…" maxLength={20000} />
        </Field>
        <div className="sm:col-span-2"><Checkbox label="Scheda attiva" checked={form.active} onChange={set('active')} /></div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2 mt-6">
        {canWrite && <Button type="submit">{saved ? 'Salvato' : 'Salva'}</Button>}
        {member.email && <MailButton email={member.email} size="md" />}
        {canWrite && member.id && (
          <Button variant="ghost" className="ml-auto" onClick={remove}><Trash2 className="size-4" /> Elimina scheda</Button>
        )}
      </div>
    </form>
  )
}

function SubscriptionTab({ member, onSaved }) {
  const { terms, can } = useAuth()
  const canWrite = can('subscriptions:write')
  const courses = useLoad(() => api.get('/api/courses'), [])
  const [form, setForm] = useState({
    cost: fromCents(member.subCostCents),
    subStart: member.subStart || '',
    subExpiry: member.subExpiry || '',
    courseIds: new Set(member.courseIds || []),
  })
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  function toggle(id) {
    const next = new Set(form.courseIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setForm({ ...form, courseIds: next })
  }

  async function save(e) {
    e.preventDefault()
    setError(null)
    try {
      const m = await api.put(`/api/members/${member.id}/subscription`, {
        subCostCents: toCents(form.cost),
        subStart: form.subStart || null,
        subExpiry: form.subExpiry || null,
        courseIds: [...form.courseIds],
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onSaved(m)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={save}>
      <ErrorBanner error={error} />
      <fieldset disabled={!canWrite}>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Costo (€)"><Input inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
          <Field label="Inizio"><Input type="date" value={form.subStart} onChange={(e) => setForm({ ...form, subStart: e.target.value })} /></Field>
          <Field label="Scadenza"><Input type="date" value={form.subExpiry} onChange={(e) => setForm({ ...form, subExpiry: e.target.value })} /></Field>
        </div>
        <p className="text-sm font-medium mt-6 mb-1">{terms.courses} inclusi</p>
        <p className="text-xs text-muted mb-3">Si possono prenotare solo i corsi selezionati. Selezionane più di uno per un abbonamento combinato.</p>
        {courses.loading ? (
          <Loading />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {courses.data?.map((c) => (
              <label key={c.id} className="flex items-start gap-3 rounded-card border border-line p-3 cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" checked={form.courseIds.has(c.id)} onChange={() => toggle(c.id)} />
                <span className="text-sm">
                  <span className="font-medium block">{c.name}</span>
                  <span className="text-muted text-xs">{schedulesLabel(c.schedules)} · {euro(c.priceCents)}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {canWrite && <Button type="submit" className="mt-6">{saved ? 'Salvato' : `Salva ${terms.subscription.toLowerCase()}`}</Button>}
    </form>
  )
}

function DocumentsTab({ member }) {
  const { can, terms, type } = useAuth()
  const canWrite = can('documents:write')
  const docs = useLoad(() => api.get(`/api/members/${member.id}/documents`), [member.id])
  const [form, setForm] = useState({ name: terms.plan, expiry: '', cost: '', file: null })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [inputKey, setInputKey] = useState(0)

  async function upload(e) {
    e.preventDefault()
    if (!form.file) return
    const fd = new FormData()
    fd.append('file', form.file)
    fd.append('kind', type === 'medico' ? 'piano_alimentare' : 'piano_allenamento')
    if (form.name) fd.append('name', form.name)
    if (form.expiry) fd.append('expiry', form.expiry)
    const cents = toCents(form.cost)
    if (cents !== null) fd.append('costCents', String(cents))
    setBusy(true)
    setError(null)
    try {
      await api.upload(`/api/members/${member.id}/documents`, fd)
      setForm({ name: terms.plan, expiry: '', cost: '', file: null })
      setInputKey((k) => k + 1)
      docs.reload()
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
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div>
      <ErrorBanner error={error || docs.error} onClose={() => setError(null)} />
      {docs.loading ? (
        <Loading />
      ) : docs.data?.length === 0 ? (
        <Empty title="Nessun documento" />
      ) : (
        <ul className="divide-y divide-line mb-6">
          {docs.data?.map((d) => (
            <li key={d.id} className="py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-muted">
                  {d.uploadedByClient && <Badge tone="warn">Caricato da {terms.member.toLowerCase()}</Badge>} Caricato il {fmtDate(d.createdAt.slice(0, 10))}
                  {d.deleteAt ? ` · eliminato automaticamente il ${fmtDate(d.deleteAt)}` : ''}
                  {d.costCents != null ? ` · ${euro(d.costCents)}` : ''}
                </p>
              </div>
              <ExpiryBadge date={d.expiry} days={daysUntil(d.expiry)} />
              <Button variant="ghost" size="sm" onClick={() => downloadFile(`/api/documents/${d.id}`, d.name).catch(setError)} aria-label="Scarica">
                <Download className="size-4" />
              </Button>
              {canWrite && d.kind !== 'certificato' && (
                <Button variant="ghost" size="sm" onClick={() => remove(d)} aria-label="Elimina"><Trash2 className="size-4" /></Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canWrite && (
        <form onSubmit={upload} className="rounded-card border border-dashed border-line p-4 grid sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-sm font-medium flex items-center gap-2"><Upload className="size-4" /> Carica {terms.plan.toLowerCase()}</p>
          <p className="sm:col-span-2 text-xs text-muted">Il certificato medico lo carica {terms.member.toLowerCase()} dalla propria area: qui puoi solo visualizzarlo.</p>
          <Field label="File" hint="PDF, immagini o documenti, max 10 MB" className="sm:col-span-2">
            <Input key={inputKey} type="file" required accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,.odt,.txt" onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })} />
          </Field>
          <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Valido fino al" hint="Facoltativo"><Input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} /></Field>
          <Field label="Costo (€)" hint="Facoltativo, solo promemoria (niente fatturazione)"><Input inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy || !form.file}>Carica</Button></div>
        </form>
      )}
    </div>
  )
}

function AccessTab({ member }) {
  const { terms } = useAuth()
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState(null)

  async function create() {
    setError(null)
    try {
      setInvite(await api.post(`/api/members/${member.id}/invite`))
    } catch (err) {
      setError(err)
    }
  }

  if (member.hasAccount) {
    return (
      <p className="text-sm">
        <Badge tone="ok">Account attivo</Badge>
        <span className="ml-2 text-muted">{terms.member} può accedere e prenotare in autonomia.</span>
      </p>
    )
  }

  const mailBody = invite
    ? `Ciao ${member.fullName},\n\npuoi attivare il tuo accesso all'area riservata da questo link:\n${invite.url}\n\nIl link è valido fino al ${new Date(invite.expiresAt).toLocaleDateString('it-IT')}.`
    : ''

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} />
      <p className="text-sm text-muted">
        Genera un link di invito: {terms.member.toLowerCase()} crea il proprio account e potrà prenotare da solo/a. Il link vale 14 giorni e si usa una volta.
      </p>
      {invite ? (
        <>
          <CopyField value={invite.url} />
          {member.email && (
            <a
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              href={`mailto:${member.email}?subject=${encodeURIComponent('Il tuo accesso all\'area riservata')}&body=${encodeURIComponent(mailBody)}`}
            >
              Invia per email
            </a>
          )}
        </>
      ) : (
        <Button onClick={create}><Link2 className="size-4" /> Genera invito</Button>
      )}
    </div>
  )
}
