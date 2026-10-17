import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Login from './auth/Login'
import RedeemInvite from './auth/RedeemInvite'
import ForgotPassword from './auth/ForgotPassword'
import ResetPassword from './auth/ResetPassword'
import NoTenant from './auth/NoTenant'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import Dashboard from './pages/Dashboard'
import Courses from './pages/Courses'
import Members from './pages/Members'
import Staff from './pages/Staff'
import Calendar from './pages/Calendar'
import Attendance from './pages/Attendance'
import Documents from './pages/Documents'
import Settings from './pages/Settings'
import ClientView from './pages/ClientView'
import Platform from './pages/Platform'

export default function App() {
  const { me, loading, isClient, isOperator, isSuperadmin, can } = useAuth()
  const { pathname } = useLocation()

  // Il link ricevuto per email deve funzionare anche se nel browser c'è già una sessione aperta.
  if (pathname.startsWith('/reset-password/')) {
    return (
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    )
  }

  if (loading) return <Loading />

  if (!me) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/invite/:token" element={<RedeemInvite />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (isSuperadmin) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/platform" element={<Platform />} />
          <Route path="*" element={<Navigate to="/platform" replace />} />
        </Route>
      </Routes>
    )
  }

  if (!me.tenant) {
    return (
      <Routes>
        <Route path="/invite/:token" element={<RedeemInvite />} />
        <Route path="*" element={<NoTenant />} />
      </Routes>
    )
  }

  if (isClient) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ClientView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    )
  }

  if (!isOperator) return <NoTenant />

  // Le rotte esistono solo se l'operatore ha il permesso (e il modulo è attivo).
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        {can('courses:read') && <Route path="/courses" element={<Courses />} />}
        {can('members:read') && <Route path="/members" element={<Members />} />}
        {can('staff:read') && <Route path="/staff" element={<Staff />} />}
        {can('bookings:read') && <Route path="/calendar" element={<Calendar />} />}
        {can('bookings:read') && <Route path="/attendance" element={<Attendance />} />}
        {can('documents:read') && <Route path="/documents" element={<Documents />} />}
        {(can('settings:read') || can('users:read')) && <Route path="/settings" element={<Settings />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
