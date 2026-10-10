import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../lib/api'
import { applyTheme, termsFor } from '../theme/terms'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setMe(null)
      setLoading(false)
      return null
    }
    try {
      const data = await api.get('/api/me')
      setMe(data)
      return data
    } catch {
      setMe(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const onExpired = () => setMe(null)
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [refresh])

  // Tema "cangiante" in base al tipo di struttura.
  const type = me?.tenant?.type
  useEffect(() => applyTheme(type), [type])

  const acceptToken = useCallback(async (token) => {
    setToken(token)
    setLoading(true)
    return refresh()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    const { token } = await api.post('/api/auth/login', { email, password })
    return acceptToken(token)
  }, [acceptToken])

  const register = useCallback(async (fullName, email, password) => {
    const { token } = await api.post('/api/auth/register', { fullName, email, password })
    return acceptToken(token)
  }, [acceptToken])

  const redeemInvite = useCallback(async (inviteToken) => {
    const { token } = await api.post('/api/auth/redeem-invite', { token: inviteToken })
    return acceptToken(token)
  }, [acceptToken])

  const logout = useCallback(() => {
    setToken(null)
    setMe(null)
  }, [])

  const value = useMemo(() => {
    const permissions = new Set(me?.permissions || [])
    const modules = new Set(me?.modules || [])
    return {
      me,
      loading,
      tenant: me?.tenant || null,
      type,
      terms: termsFor(type),
      isClient: me?.role === 'client',
      isOperator: me?.role === 'admin' || me?.role === 'staff',
      isSuperadmin: me?.role === 'superadmin',
      hasModule: (m) => modules.has(m),
      /** Permesso posseduto e (per le risorse modulari) modulo attivo, come nel backend. */
      can: (perm) => {
        if (!permissions.has(perm)) return false
        const resource = perm.split(':')[0]
        const modular = ['documents', 'subscriptions', 'staff', 'reports']
        return !modular.includes(resource) || modules.has(resource)
      },
      usesSubscriptions: type !== 'medico' && modules.has('subscriptions'),
      login,
      register,
      redeemInvite,
      logout,
      refresh,
    }
  }, [me, loading, type, login, register, redeemInvite, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
