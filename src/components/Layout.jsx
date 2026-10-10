import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Building2, BarChart3, CalendarDays, FileText, LayoutDashboard, LogOut, Menu, Settings, Shapes, UserRound, Users, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { cx } from './ui'

export default function Layout() {
  const { me, tenant, terms, can, isClient, isSuperadmin, logout } = useAuth()
  const [open, setOpen] = useState(false)

  let items
  if (isSuperadmin) {
    items = [{ to: '/platform', label: 'Strutture', icon: Building2 }]
  } else if (isClient) {
    items = [{ to: '/', label: 'La mia area', icon: UserRound }]
  } else {
    items = [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      can('bookings:read') && { to: '/calendar', label: terms.calendar, icon: CalendarDays },
      can('bookings:read') && { to: '/attendance', label: 'Riepilogo mensile', icon: BarChart3 },
      can('courses:read') && { to: '/courses', label: terms.courses, icon: Shapes },
      can('members:read') && { to: '/members', label: terms.members, icon: Users },
      can('staff:read') && { to: '/staff', label: terms.staff, icon: UserRound },
      can('documents:read') && { to: '/documents', label: 'Documenti', icon: FileText },
      (can('settings:read') || can('users:read')) && { to: '/settings', label: 'Impostazioni', icon: Settings },
    ].filter(Boolean)
  }

  const title = isSuperadmin ? 'Piattaforma' : tenant?.name || 'Gestionale'
  const subtitle = isSuperadmin ? 'Super-admin' : terms.brand

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 px-3 py-2 rounded-card text-sm font-medium transition',
              isActive ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink hover:bg-surface-2',
            )
          }
        >
          <Icon className="size-4.5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  const user = (
    <div className="border-t border-line pt-4 mt-4">
      <p className="text-sm font-medium truncate">{me.fullName}</p>
      <p className="text-xs text-muted truncate">{me.groupName || (isClient ? terms.member : me.email)}</p>
      <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm text-muted hover:text-ink">
        <LogOut className="size-4" /> Esci
      </button>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      {/* Barra superiore mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-surface border-b border-line px-4 h-14">
        <div className="min-w-0">
          <p className="font-semibold truncate">{title}</p>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Menu" className="p-2 -mr-2">
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)}>
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <p className="font-semibold">{title}</p>
              <button onClick={() => setOpen(false)} aria-label="Chiudi">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1">{nav}</div>
            {user}
          </aside>
        </div>
      )}

      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-surface border-r border-line p-4 sticky top-0 h-screen">
        <div className="mb-8 px-2">
          <p className="text-xs uppercase tracking-wider text-accent font-semibold">{subtitle}</p>
          <p className="brand-title text-lg font-semibold leading-tight mt-0.5">{title}</p>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {user}
      </aside>

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  )
}
