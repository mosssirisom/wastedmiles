import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { setAuthToken } from './api'
import { loadJSON, saveJSON, removeKey } from './persist'

export interface AuthUser {
  id: string
  name: string
  email: string
  operatorId: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
  signIn: (email: string, name?: string) => Promise<void>
  signOut: () => void
}

const STORAGE_KEY = 'wm-auth'

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  loading: false,
  signIn: async () => {},
  signOut: () => {},
})

interface Stored {
  user: AuthUser | null
  token: string | null
}

// Local demo identity when no auth backend is configured/reachable.
function demoIdentity(email: string, name?: string): Stored {
  const handle = email.split('@')[0] || 'operator'
  const id = `u_${handle.toLowerCase().replace(/[^a-z0-9]+/g, '')}`
  return {
    user: {
      id,
      name: name?.trim() || handle.replace(/(^|\s)\S/g, (c) => c.toUpperCase()),
      email,
      operatorId: id,
    },
    token: `demo.${btoa(`${id}:${Date.now()}`)}`,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(() =>
    loadJSON<Stored>(STORAGE_KEY, { user: null, token: null })
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setAuthToken(state.token)
  }, [state.token])

  const signIn = async (email: string, name?: string) => {
    setLoading(true)
    try {
      const url = import.meta.env.VITE_AUTH_API_URL || '/api/auth'
      let next: Stored
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name }),
        })
        if (!res.ok) throw new Error('auth failed')
        const data = (await res.json()) as { token: string; user: AuthUser }
        next = { user: data.user, token: data.token }
      } catch {
        next = demoIdentity(email, name)
      }
      setState(next)
      saveJSON(STORAGE_KEY, next)
    } finally {
      setLoading(false)
    }
  }

  const signOut = () => {
    setState({ user: null, token: null })
    removeKey(STORAGE_KEY)
    setAuthToken(null)
  }

  return (
    <AuthContext.Provider value={{ ...state, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
