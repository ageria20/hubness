import { useState } from 'react'
import { Link2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { Badge, Button, Card, CopyField, Empty, ErrorBanner, Field, Input, Loading, Modal, PageHeader, Select, Tabs, useLoad } from '../components/ui'

const RESOURCE_LABELS = {
  courses: 'Corsi / prestazioni',
  members: 'Iscritti / pazienti',
  staff: 'Staff',
  bookings: 'Prenotazioni',
  documents: 'Documenti',
  subscriptions: 'Abbonamenti',
  reports: 'Report',
  settings: 'Impostazioni struttura',
  users: 'Account e gruppi',
}

export default function Settings() {
  const { can } = useAuth()
  const tabs = []
  if (can('settings:read')) tabs.push({ value: 'tenant', label: 'Struttura' })
  if (can('users:read')) tabs.push({ value: 'groups', label: 'Gruppi' }, { value: 'operators', label: 'Operatori' })
  const [tab, setTab] = useState(tabs[0]?.value)

  return (
    <>
      <PageHeader title="Impostazioni" />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'tenant' && <TenantTab />}
      {tab === 'groups' && <GroupsTab />}
      {tab === 'operators' && <OperatorsTab />}
    </>
  )
}

function TenantTab() {
  const { tenant, can, refresh } = useAuth()
  const [form, setForm] = useState({ name: tenant.name, contactEmail: tenant.contactEmail || '' })
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.put('/api/tenant', form)
      await refresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Card className="p-5 max-w-xl">
      <ErrorBanner error={error} />
      <form onSubmit={save}>
        <fieldset disabled={!can('settings:write')} className="space-y-4">
          <Field label="Nome struttura"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email di contatto" hint="Riceve il riepilogo giornaliero delle scadenze ed è l'indirizzo di risposta degli avvisi.">
            <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </Field>
          <p className="text-sm text-muted">Moduli attivi: {tenant.modules.length ? tenant.modules.join(', ') : 'nessuno'}. Per cambiarli contatta il fornitore del servizio.</p>
          {can('settings:write') && <Button type="submit">{saved ? 'Salvato' : 'Salva'}</Button>}
        </fieldset>
      </form>
    </Card>
  )
}

function GroupsTab() {
  const { can } = useAuth()
  const groups = useLoad(() => api.get('/api/groups'), [])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const canWrite = can('users:write')

  async function remove(g) {
    if (!confirm(`Eliminare il gruppo "${g.name}"?`)) return
    try {
      await api.del(`/api/groups/${g.id}`)
      groups.reload()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm text-muted max-w-2xl">
          Un gruppo decide quali sezioni vede un operatore e se può solo leggere o anche modificare. I gruppi predefiniti non si modificano: creane di personalizzati.
        </p>
        {canWrite && <Button onClick={() => setEditing({ permissions: [] })}><Plus className="size-4" /> Nuovo gruppo</Button>}
      </div>
      <ErrorBanner error={error || groups.error} onClose={() => setError(null)} />
      {groups.loading ? (
        <Loading />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {groups.data?.map((g) => (
            <Card key={g.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {g.system && <ShieldCheck className="size-4 text-accent" />}
                    {g.name}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">{g.userCount} operatori{g.system ? ' · predefinito' : ''}</p>
                </div>
                {canWrite && !g.system && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(g)} aria-label="Modifica"><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(g)} aria-label="Elimina"><Trash2 className="size-4" /></Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {summarize(g.permissions).map(([res, level]) => (
                  <Badge key={res} tone={level === 'write' ? 'accent' : 'neutral'}>
                    {RESOURCE_LABELS[res]}{level === 'read' ? ' (lettura)' : ''}
                  </Badge>
                ))}
                {g.permissions.length === 0 && <span className="text-sm text-muted">Nessun permesso</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <GroupForm group={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); groups.reload() }} />}
    </>
  )
}

function summarize(perms) {
  const set = new Set(perms)
  return Object.keys(RESOURCE_LABELS)
    .map((r) => [r, set.has(`${r}:write`) ? 'write' : set.has(`${r}:read`) ? 'read' : null])
    .filter(([, l]) => l)
}

function GroupForm({ group, onClose, onSaved }) {
  const initial = Object.fromEntries(summarize(group.permissions))
  const [name, setName] = useState(group.name || '')
  const [levels, setLevels] = useState(initial)
  const [error, setError] = useState(null)

  async function save(e) {
    e.preventDefault()
    const permissions = Object.entries(levels).flatMap(([r, l]) => (l === 'write' ? [`${r}:read`, `${r}:write`] : l === 'read' ? [`${r}:read`] : []))
    try {
      if (group.id) await api.put(`/api/groups/${group.id}`, { name, permissions })
      else await api.post('/api/groups', { name, permissions })
      onSaved()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Modal
      open
      title={group.id ? 'Modifica gruppo' : 'Nuovo gruppo'}
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Annulla</Button><Button type="submit" form="group-form">Salva</Button></>}
    >
      <ErrorBanner error={error} />
      <form id="group-form" onSubmit={save} className="space-y-4">
        <Field label="Nome del gruppo"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="divide-y divide-line border border-line rounded-card">
          {Object.entries(RESOURCE_LABELS).map(([res, label]) => (
            <div key={res} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm">{label}</span>
              <Select value={levels[res] || ''} onChange={(e) => setLevels({ ...levels, [res]: e.target.value || null })} className="w-40">
                <option value="">Nessun accesso</option>
                <option value="read">Lettura</option>
                <option value="write">Lettura e modifica</option>
              </Select>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  )
}

function OperatorsTab() {
  const { me, can } = useAuth()
  const operators = useLoad(() => api.get('/api/users'), [])
  const groups = useLoad(() => api.get('/api/groups'), [])
  const [error, setError] = useState(null)
  const [inviteGroup, setInviteGroup] = useState('')
  const [invite, setInvite] = useState(null)
  const canWrite = can('users:write')

  async function assign(u, groupId) {
    setError(null)
    try {
      await api.put(`/api/users/${u.id}/group`, { groupId })
      operators.reload()
    } catch (e) {
      setError(e)
    }
  }

  async function remove(u) {
    if (!confirm(`Rimuovere l'accesso di ${u.fullName} alla struttura?`)) return
    try {
      await api.del(`/api/users/${u.id}`)
      operators.reload()
    } catch (e) {
      setError(e)
    }
  }

  async function createInvite() {
    setError(null)
    try {
      setInvite(await api.post('/api/users/invite', { groupId: inviteGroup }))
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <ErrorBanner error={error || operators.error} onClose={() => setError(null)} />
      <Card className="mb-6">
        {operators.loading ? (
          <Loading />
        ) : operators.data?.length === 0 ? (
          <Empty title="Nessun operatore" />
        ) : (
          <ul className="divide-y divide-line">
            {operators.data?.map((u) => (
              <li key={u.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-48">
                  <p className="font-medium">{u.fullName}{u.id === me.userId && <span className="text-muted font-normal"> (tu)</span>}</p>
                  <p className="text-sm text-muted">{u.email}</p>
                </div>
                {canWrite && u.id !== me.userId ? (
                  <>
                    <Select value={u.groupId || ''} onChange={(e) => assign(u, e.target.value)} className="w-48">
                      {!u.groupId && <option value="">Predefinito ({u.role})</option>}
                      {groups.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => remove(u)} aria-label="Rimuovi"><Trash2 className="size-4" /></Button>
                  </>
                ) : (
                  <Badge tone="accent">{u.groupName || u.role}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {canWrite && (
        <Card className="p-5 max-w-xl">
          <h3 className="font-semibold mb-1">Invita un operatore</h3>
          <p className="text-sm text-muted mb-4">Genera un link: la persona crea il proprio account e riceve i permessi del gruppo scelto.</p>
          <div className="flex gap-2 items-end">
            <Field label="Gruppo" className="flex-1">
              <Select value={inviteGroup} onChange={(e) => { setInviteGroup(e.target.value); setInvite(null) }}>
                <option value="">Seleziona…</option>
                {groups.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </Field>
            <Button onClick={createInvite} disabled={!inviteGroup}><Link2 className="size-4" /> Genera</Button>
          </div>
          {invite && <div className="mt-4"><CopyField value={invite.url} /></div>}
        </Card>
      )}
    </>
  )
}
