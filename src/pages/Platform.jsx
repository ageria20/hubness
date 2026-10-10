import { useState } from 'react'
import { Building2, Link2, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { Badge, Button, Card, Checkbox, CopyField, Empty, ErrorBanner, Field, Input, Loading, Modal, PageHeader, Select, useLoad } from '../components/ui'

const MODULES = [
  ['documents', 'Documenti'],
  ['subscriptions', 'Abbonamenti'],
  ['staff', 'Staff'],
  ['reports', 'Report'],
]
const TYPES = { palestra: 'Palestra', ritmica: 'Ginnastica ritmica', medico: 'Studio medico' }

/** Super-admin: crea strutture, sceglie i moduli attivi, sospende, invita il primo amministratore. */
export default function Platform() {
  const tenants = useLoad(() => api.get('/api/tenants'), [])
  const [creating, setCreating] = useState(false)
  const [invites, setInvites] = useState({})
  const [error, setError] = useState(null)

  async function toggleModule(t, m, on) {
    const modules = on ? [...t.modules, m] : t.modules.filter((x) => x !== m)
    try {
      await api.put(`/api/tenants/${t.id}/modules`, { modules })
      tenants.reload()
    } catch (e) {
      setError(e)
    }
  }

  async function suspend(t) {
    if (!t.suspended && !confirm(`Sospendere "${t.name}"? Nessuno potrà più accedere finché non la riattivi.`)) return
    try {
      await api.put(`/api/tenants/${t.id}/suspended`, { suspended: !t.suspended })
      tenants.reload()
    } catch (e) {
      setError(e)
    }
  }

  async function invite(t) {
    try {
      const inv = await api.post(`/api/tenants/${t.id}/invite`)
      setInvites({ ...invites, [t.id]: inv.url })
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <PageHeader
        title="Strutture"
        subtitle="Accendi per ogni gestore solo i moduli che gli servono."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> Nuova struttura</Button>}
      />
      <ErrorBanner error={error || tenants.error} onClose={() => setError(null)} />
      {tenants.loading ? (
        <Loading />
      ) : tenants.data?.length === 0 ? (
        <Card><Empty icon={Building2} title="Nessuna struttura" /></Card>
      ) : (
        <div className="space-y-4">
          {tenants.data?.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge tone="accent">{TYPES[t.type]}</Badge>
                    {t.suspended && <Badge tone="danger">Sospesa</Badge>}
                    {t.contactEmail && <span className="text-sm text-muted">{t.contactEmail}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => invite(t)}><Link2 className="size-3.5" /> Invito amministratore</Button>
                  <Button variant={t.suspended ? 'primary' : 'danger'} size="sm" onClick={() => suspend(t)}>{t.suspended ? 'Riattiva' : 'Sospendi'}</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 pt-4 border-t border-line">
                {MODULES.map(([m, label]) => (
                  <Checkbox key={m} label={label} checked={t.modules.includes(m)} onChange={(e) => toggleModule(t, m, e.target.checked)} />
                ))}
              </div>
              {invites[t.id] && (
                <div className="mt-4">
                  <p className="text-sm text-muted mb-1">Link per il primo amministratore (valido 14 giorni):</p>
                  <CopyField value={invites[t.id]} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {creating && <CreateTenant onClose={() => setCreating(false)} onSaved={() => { setCreating(false); tenants.reload() }} />}
    </>
  )
}

function CreateTenant({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', type: 'palestra', contactEmail: '' })
  const [error, setError] = useState(null)

  async function save(e) {
    e.preventDefault()
    try {
      await api.post('/api/tenants', { ...form, contactEmail: form.contactEmail || null })
      onSaved()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Modal open title="Nuova struttura" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Annulla</Button><Button type="submit" form="tenant-form">Crea</Button></>}>
      <ErrorBanner error={error} />
      <form id="tenant-form" onSubmit={save} className="space-y-4">
        <Field label="Nome"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Tipo" hint="Determina tema, terminologia e regole (capienza, abbonamenti o visite).">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Email di contatto"><Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></Field>
      </form>
    </Modal>
  )
}
