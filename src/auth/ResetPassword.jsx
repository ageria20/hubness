import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { Button, Card, ErrorBanner, Field, Input } from '../components/ui'

/** /reset-password/:token — nuova password dal link ricevuto per email. */
export default function ResetPassword() {
  const { token } = useParams()
  const { me, logout } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const mismatch = confirm !== '' && confirm !== password

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setDone(true)
      // le sessioni aperte non valgono più: si riparte dall'accesso
      if (me) logout()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-1">Nuova password</h1>
        {done ? (
          <>
            <p className="text-sm mb-4">Password aggiornata. Ora puoi accedere con la nuova password.</p>
            <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>Vai all'accesso</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mb-5">Scegli una nuova password per il tuo account.</p>
            <ErrorBanner error={error} />
            {error && (
              <p className="text-sm mb-4"><Link to="/forgot-password" className="text-accent hover:underline">Richiedi un nuovo link</Link></p>
            )}
            <form onSubmit={submit} className="space-y-4">
              <Field label="Nuova password" hint="Almeno 8 caratteri">
                <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
              </Field>
              <Field label="Ripeti la password" hint={mismatch ? 'Le due password non coincidono' : undefined}>
                <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={mismatch} />
              </Field>
              <Button type="submit" className="w-full" disabled={busy || mismatch}>Salva la password</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}
