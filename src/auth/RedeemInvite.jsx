import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Login from './Login'
import { Button, Card, ErrorBanner, Spinner } from '../components/ui'

/** /invite/:token — se serve fa accedere o registrare, poi collega l'account alla struttura. */
export default function RedeemInvite() {
  const { token } = useParams()
  const { me, redeemInvite, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const started = useRef(false)

  useEffect(() => {
    if (!me || me.tenant || me.role === 'superadmin' || started.current) return
    started.current = true
    redeemInvite(token)
      .then(() => navigate('/', { replace: true }))
      .catch(setError)
  }, [me, token, redeemInvite, navigate])

  if (!me) return <Login intro="Hai ricevuto un invito: accedi o crea un account per attivarlo." />

  if (me.tenant || me.role === 'superadmin') {
    return (
      <Centered>
        <p className="mb-4">Sei già collegato a una struttura con questo account. Per usare l'invito esci e accedi con un altro account.</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')}>Vai alla tua area</Button>
          <Button variant="secondary" onClick={logout}>Esci</Button>
        </div>
      </Centered>
    )
  }

  return (
    <Centered>
      {error ? (
        <>
          <ErrorBanner error={error} />
          <Button variant="secondary" onClick={() => navigate('/')}>Indietro</Button>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Spinner /> Attivazione dell'invito…
        </div>
      )}
    </Centered>
  )
}

function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">{children}</Card>
    </div>
  )
}
