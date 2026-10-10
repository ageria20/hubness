import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { daysUntil, fmtDate, hhmm, isoDate, today } from '../lib/format'
import { Card, Empty, ErrorBanner, ExpiryBadge, Loading, MailButton, PageHeader, useLoad } from '../components/ui'

const KIND_LABEL = { subscription: 'Abbonamento', certificate: 'Certificato medico', document: 'Documento' }

export default function Dashboard() {
  const { me, tenant, terms, can } = useAuth()
  const summary = useLoad(() => (can('reports:read') ? api.get('/api/reports/summary') : Promise.resolve(null)), [])
  const expiries = useLoad(() => (can('members:read') ? api.get('/api/reports/expiries?days=30') : Promise.resolve(null)), [])
  const todayIso = isoDate(today())
  const bookings = useLoad(() => (can('bookings:read') ? api.get(`/api/bookings?date=${todayIso}`) : Promise.resolve(null)), [])

  return (
    <>
      <PageHeader title={`Ciao ${me.fullName.split(' ')[0]}`} subtitle={`${tenant.name} · ${fmtDate(todayIso, { weekday: 'long', day: 'numeric', month: 'long' })}`} />

      {summary.data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label={`${terms.members} attivi`} value={summary.data.activeMembers} />
          <Stat label={terms.coursesActive} value={summary.data.activeCourses} />
          <Stat label={`${terms.bookings} oggi`} value={summary.data.bookingsToday} />
          <Stat label="Prossimi 7 giorni" value={summary.data.bookingsNext7Days} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {expiries.data !== null && (
          <Card className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <AlertTriangle className="size-4 text-warn" /> Scadenze in evidenza
            </h2>
            <ErrorBanner error={expiries.error} />
            {expiries.loading ? (
              <Loading />
            ) : expiries.data.items.length === 0 ? (
              <Empty title="Nessuna scadenza nei prossimi 30 giorni" />
            ) : (
              <ul className="divide-y divide-line">
                {expiries.data.items.map((it, i) => (
                  <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{it.memberName}</p>
                      <p className="text-xs text-muted truncate">
                        {KIND_LABEL[it.kind]}
                        {it.kind === 'document' ? ` · ${it.label}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ExpiryBadge date={it.date} days={daysUntil(it.date)} />
                      <MailButton email={it.email} subject="Promemoria scadenza" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {bookings.data !== null && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <CalendarDays className="size-4 text-accent" /> {terms.bookings} di oggi
              </h2>
              <Link to="/calendar" className="text-sm text-accent hover:underline">
                Apri {terms.calendar.toLowerCase()}
              </Link>
            </div>
            <ErrorBanner error={bookings.error} />
            {bookings.loading ? (
              <Loading />
            ) : bookings.data.length === 0 ? (
              <Empty title={`Nessun${terms.booking === 'Prenotazione' ? 'a prenotazione' : ' appuntamento'} oggi`} />
            ) : (
              <ul className="divide-y divide-line">
                {bookings.data.map((b) => (
                  <li key={b.id} className="py-2.5 flex items-center gap-3 text-sm">
                    <span className="font-mono text-muted w-12">{hhmm(b.startTime)}</span>
                    <span className="font-medium flex-1 truncate">{b.memberName}</span>
                    <span className="text-muted truncate">{b.courseName}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </Card>
  )
}
