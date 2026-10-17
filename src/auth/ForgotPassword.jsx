import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Button, Card, ErrorBanner, Field, Input } from '../components/ui'

/** /forgot-password — chiede l'email e, se è registrata, spedisce il link per scegliere una nuova password. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-1">Recupera la password</h1>
        {sent ? (
          <>
            <p className="text-sm mb-4">
              Se l'indirizzo <strong>{email}</strong> è registrato, riceverai un'email con il link per scegliere una nuova password.
              Il link vale un'ora. Controlla anche la cartella dello spam.
            </p>
            <Link to="/login" className="text-sm text-accent hover:underline">Torna all'accesso</Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mb-5">Scrivi l'email del tuo account: ti mandiamo un link per sceglierne una nuova.</p>
            <ErrorBanner error={error} />
            <form onSubmit={submit} className="space-y-4">
              <Field label="Email">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
              </Field>
              <Button type="submit" className="w-full" disabled={busy}>Invia il link</Button>
            </form>
            <p className="text-sm mt-4"><Link to="/login" className="text-accent hover:underline">Torna all'accesso</Link></p>
          </>
        )}
      </Card>
    </div>
  )
}
