import { useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { fmtDate, isoDate, today } from '../lib/format'
import { Button, Card, Empty, ErrorBanner, Loading, MailButton, PageHeader, Select, useLoad } from '../components/ui'

/** Riepilogo mensile: quante volte si è prenotato (e si è presentato) ogni iscritto. */
export default function Attendance() {
  const { terms } = useAuth()
  const courses = useLoad(() => api.get('/api/courses'), [])
  const hasOpenGym = (courses.data || []).some((c) => c.kind === 'open_gym')
  const [month, setMonth] = useState(() => isoDate(today()).slice(0, 7))
  // '' = tutti i corsi, 'open_gym' = tutto l'Open Gym, altrimenti l'id di un corso
  const [scope, setScope] = useState(null)
  const effective = scope ?? (hasOpenGym ? 'open_gym' : '')
  const query = effective === '' ? '' : effective === 'open_gym' ? '&kind=open_gym' : `&courseId=${effective}`
  const rows = useLoad(
    () => (courses.loading ? Promise.resolve(null) : api.get(`/api/bookings/monthly?month=${month}${query}`)),
    [month, query, courses.loading],
  )

  const shift = (n) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + n, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const total = (rows.data || []).reduce((a, r) => a + r.bookings, 0)
  const presences = (rows.data || []).reduce((a, r) => a + r.presences, 0)

  return (
    <>
      <PageHeader
        title="Riepilogo mensile"
        subtitle={`Quante volte si è prenotato ogni ${terms.member.toLowerCase()} nel mese.`}
        actions={
          <>
            <Select value={effective} onChange={(e) => setScope(e.target.value)} className="w-auto">
              {hasOpenGym && <option value="open_gym">Open Gym</option>}
              <option value="">{terms.allCourses}</option>
              {(courses.data || []).filter((c) => c.kind !== 'open_gym').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => shift(-1)} aria-label="Mese precedente"><ChevronLeft className="size-4" /></Button>
            <Button variant="secondary" onClick={() => setMonth(isoDate(today()).slice(0, 7))}>Mese corrente</Button>
            <Button variant="secondary" onClick={() => shift(1)} aria-label="Mese successivo"><ChevronRight className="size-4" /></Button>
          </>
        }
      />
      <ErrorBanner error={rows.error || courses.error} />
      <Card>
        <div className="px-5 py-4 border-b border-line">
          <p className="font-semibold capitalize">{fmtDate(`${month}-01`, { month: 'long', year: 'numeric' })}</p>
          <p className="text-sm text-muted">{total} prenotazioni · {presences} presenze segnate</p>
        </div>
        {(rows.loading && !rows.data) || courses.loading ? (
          <Loading />
        ) : !rows.data?.length ? (
          <Empty icon={BarChart3} title="Nessuna prenotazione in questo mese" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">{terms.member}</th>
                  <th className="px-3 py-2.5 font-medium text-right">Prenotazioni</th>
                  <th className="px-3 py-2.5 font-medium text-right">Presenze</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.data.map((r) => (
                  <tr key={r.memberId}>
                    <td className="px-5 py-2.5 font-medium">{r.memberName}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.bookings}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted">{r.presences}</td>
                    <td className="px-3 py-2.5 text-right"><MailButton email={r.email} /></td>
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
