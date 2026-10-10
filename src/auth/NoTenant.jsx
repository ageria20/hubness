import { useState } from 'react'
import { useAuth } from './AuthContext'
import { Button, Card, ErrorBanner, Field, Input } from '../components/ui'

/** Account registrato ma non ancora collegato a una struttura: si incolla il link/codice di invito. */
export default function NoTenant() {
  const { me, redeemInvite, logout } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const token = code.trim().split('/invite/').pop().replace(/[/?#].*$/, '')
    setBusy(true)
    setError(null)
    try {
      await redeemInvite(token)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold mb-1">Ciao {me.fullName}</h1>
        <p className="text-sm text-muted mb-5">
          Il tuo account non è ancora collegato a una struttura. Incolla qui il link o il codice di invito che hai ricevuto.
        </p>
        <ErrorBanner error={error} />
        <form onSubmit={submit} className="space-y-4">
          <Field label="Link o codice di invito">
            <Input required value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>Attiva invito</Button>
            <Button variant="ghost" onClick={logout}>Esci</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
