import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi, type AuthSession } from '@/features/auth/auth-api'

interface AuthContextValue {
  session: AuthSession | null
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    authApi
      .getSession()
      .then((initial) => {
        if (active) setSession(initial)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    const unsubscribe = authApi.subscribe((next) => {
      setSession(next)
      setIsLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAdmin: session !== null,
      isLoading,
    }),
    [session, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): {
  session: AuthSession | null
  isAdmin: boolean
  isLoading: boolean
} {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return ctx
}
