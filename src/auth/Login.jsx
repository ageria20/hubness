import { useState } from 'react'
import { useAuth } from './AuthContext'
import { Button, Card, ErrorBanner, Field, Input, Tabs } from '../components/ui'

export default function Login({ intro }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form.fullName, form.email, form.password)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-1">Gestionale</h1>
        <p className="text-sm text-muted mb-5">{intro || 'Accedi alla tua area.'}</p>
        <Tabs
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError(null)
          }}
          tabs={[
            { value: 'login', label: 'Accedi' },
            { value: 'register', label: 'Crea account' },
          ]}
        />
        <ErrorBanner error={error} />
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <Field label="Nome e cognome">
              <Input required value={form.fullName} onChange={set('fullName')} autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </Field>
          <Field label="Password" hint={mode === 'register' ? 'Almeno 8 caratteri' : undefined}>
            <Input
              type="password"
              required
              minLength={mode === 'register' ? 8 : undefined}
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === 'login' ? 'Accedi' : 'Crea account'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
