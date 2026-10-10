import { useMemo, useState } from 'react'
import { Download, FileText, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api, downloadFile } from '../lib/api'
import { daysUntil, euro } from '../lib/format'
import { Badge, Button, Card, Empty, ErrorBanner, ExpiryBadge, Loading, PageHeader, Tabs, useLoad } from '../components/ui'

export default function Documents() {
  const { can } = useAuth()
  const docs = useLoad(() => api.get('/api/documents'), [])
  const [filter, setFilter] = useState('expiring')
  const [error, setError] = useState(null)

  const shown = useMemo(() => {
    const list = docs.data || []
    if (filter === 'all') return list
    return list.filter((d) => d.expiry && daysUntil(d.expiry) <= 30)
  }, [docs.data, filter])

  async function remove(d) {
    if (!confirm(`Eliminare "${d.name}" di ${d.memberName}?`)) return
    try {
      await api.del(`/api/documents/${d.id}`)
      docs.reload()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <PageHeader title="Documenti" subtitle="Certificati, consensi e altri documenti con le loro scadenze. Si caricano dalla scheda della persona." />
      <ErrorBanner error={error || docs.error} onClose={() => setError(null)} />
      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'expiring', label: 'Scaduti e in scadenza (30 gg)' },
          { value: 'all', label: 'Tutti' },
        ]}
      />
      <Card className="overflow-hidden">
        {docs.loading ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty icon={FileText} title={filter === 'all' ? 'Nessun documento' : 'Nessun documento in scadenza'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted border-b border-line">
                <tr>
                  <th className="px-5 py-3 font-medium">Documento</th>
                  <th className="px-3 py-3 font-medium">Persona</th>
                  <th className="px-3 py-3 font-medium">Scadenza</th>
                  <th className="px-3 py-3 font-medium hidden sm:table-cell">Costo</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-3 font-medium">{d.name}{d.uploadedByClient && <> <Badge tone="warn">dal cliente</Badge></>}</td>
                    <td className="px-3 py-3">{d.memberName}</td>
                    <td className="px-3 py-3"><ExpiryBadge date={d.expiry} days={daysUntil(d.expiry)} /></td>
                    <td className="px-3 py-3 hidden sm:table-cell text-muted">{d.costCents != null ? euro(d.costCents) : '—'}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => downloadFile(`/api/documents/${d.id}`, d.name).catch(setError)} aria-label="Scarica">
                        <Download className="size-4" />
                      </Button>
                      {can('documents:write') && d.kind !== 'certificato' && (
                        <Button variant="ghost" size="sm" onClick={() => remove(d)} aria-label="Elimina"><Trash2 className="size-4" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
