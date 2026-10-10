import { useMemo, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { daysUntil } from '../lib/format'
import { Badge, Button, Card, Empty, ErrorBanner, ExpiryBadge, Input, Loading, MailButton, PageHeader, useLoad } from '../components/ui'
import MemberDetail from './MemberDetail'

export default function Members() {
  const { terms, can, usesSubscriptions } = useAuth()
  const list = useLoad(() => api.get('/api/members'), [])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const showSubs = usesSubscriptions && can('subscriptions:read')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!list.data) return []
    if (!q) return list.data
    return list.data.filter((m) => [m.fullName, m.email, m.phone].some((v) => v?.toLowerCase().includes(q)))
  }, [list.data, query])

  return (
    <>
      <PageHeader
        title={terms.members}
        subtitle={`${list.data?.length ?? 0} schede`}
        actions={can('members:write') && <Button onClick={() => setSelected({})}><Plus className="size-4" /> Nuova scheda</Button>}
      />
      <ErrorBanner error={list.error} />
      <div className="relative mb-4 max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input placeholder="Cerca per nome, email, telefono" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>
      <Card className="overflow-hidden">
        {list.loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty icon={Users} title={query ? 'Nessun risultato' : `Nessun${terms.member === 'Allieva' ? 'a allieva' : ' ' + terms.member.toLowerCase()}`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted border-b border-line">
                <tr>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-3 py-3 font-medium hidden md:table-cell">Contatti</th>
                  {showSubs && <th className="px-3 py-3 font-medium">{terms.subscription}</th>}
                  <th className="px-3 py-3 font-medium">Certificato</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2 cursor-pointer" onClick={() => setSelected(m)}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{m.fullName}</p>
                      <div className="flex gap-1 mt-0.5">
                        {!m.active && <Badge>Non attivo</Badge>}
                        {m.hasAccount && <Badge tone="accent">Account</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted">
                      <p>{m.email || '—'}</p>
                      <p>{m.phone}</p>
                    </td>
                    {showSubs && <td className="px-3 py-3"><ExpiryBadge date={m.subExpiry} days={daysUntil(m.subExpiry)} /></td>}
                    <td className="px-3 py-3"><ExpiryBadge date={m.certExpiry} days={daysUntil(m.certExpiry)} /></td>
                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <MailButton email={m.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selected && (
        <MemberDetail
          member={selected}
          onClose={() => setSelected(null)}
          onChanged={(m) => {
            list.reload()
            if (m) setSelected(m)
          }}
          onDeleted={() => {
            setSelected(null)
            list.reload()
          }}
        />
      )}
    </>
  )
}
