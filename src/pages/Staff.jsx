import { useState } from 'react'
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { Button, Card, Empty, ErrorBanner, Field, Input, Loading, MailButton, Modal, PageHeader, useLoad } from '../components/ui'

export default function Staff() {
  const { terms, can } = useAuth()
  const canWrite = can('staff:write')
  const list = useLoad(() => api.get('/api/staff'), [])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)

  async function remove(s) {
    if (!confirm(`Eliminare ${s.name}?`)) return
    try {
      await api.del(`/api/staff/${s.id}`)
      list.reload()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <PageHeader
        title={terms.staff}
        subtitle={`Le figure che erogano il servizio. Ogni ${terms.course.toLowerCase()} può essere associato a una di loro.`}
        actions={canWrite && <Button onClick={() => setEditing({})}><Plus className="size-4" /> Aggiungi</Button>}
      />
      <ErrorBanner error={error || list.error} onClose={() => setError(null)} />
      <Card>
        {list.loading ? (
          <Loading />
        ) : list.data?.length === 0 ? (
          <Empty icon={UserRound} title={`Nessun ${terms.staffMember.toLowerCase()}`} />
        ) : (
          <ul className="divide-y divide-line">
            {list.data?.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-sm text-muted truncate">{s.roleLabel || terms.staffMember}</p>
                </div>
                <MailButton email={s.email} />
                {canWrite && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(s)} aria-label="Modifica"><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s)} aria-label="Elimina"><Trash2 className="size-4" /></Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing && <StaffForm staff={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload() }} />}
    </>
  )
}

function StaffForm({ staff, onClose, onSaved }) {
  const { terms } = useAuth()
  const [form, setForm] = useState({ name: staff.name || '', roleLabel: staff.roleLabel || terms.staffMember, email: staff.email || '' })
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function save(e) {
    e.preventDefault()
    try {
      if (staff.id) await api.put(`/api/staff/${staff.id}`, form)
      else await api.post('/api/staff', form)
      onSaved()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Modal
      open
      title={staff.id ? 'Modifica' : `Nuovo ${terms.staffMember.toLowerCase()}`}
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Annulla</Button><Button type="submit" form="staff-form">Salva</Button></>}
    >
      <ErrorBanner error={error} />
      <form id="staff-form" onSubmit={save} className="space-y-4">
        <Field label="Nome e cognome"><Input required value={form.name} onChange={set('name')} /></Field>
        <Field label="Qualifica" hint='Es. "Osteopata", "Istruttore", "Nutrizionista"'><Input value={form.roleLabel} onChange={set('roleLabel')} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
      </form>
    </Modal>
  )
}
