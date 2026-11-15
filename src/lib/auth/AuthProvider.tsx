'use client'

import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/** The signed-in shopper as the browser sees it (from /api/users/me, using the http-only cookie). */
export type SessionUser = { id: number; email: string; fullName?: string | null; roles?: string[] }

type AuthState = { user: SessionUser | null; ready: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState>({ user: null, ready: false, refresh: async () => {}, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)
  const pathname = usePathname()

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' })
      const json = (await res.json()) as { user?: SessionUser | null }
      setUser(json.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  // Re-check after navigation (sign-in and sign-out actions redirect)
  useEffect(() => {
    // refresh() only sets state after the network request resolves
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh, pathname])

  const signOut = useCallback(async () => {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    setUser(null)
    window.dispatchEvent(new Event('tos:signed-out'))
  }, [])

  const value = useMemo(() => ({ user, ready, refresh, signOut }), [user, ready, refresh, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
