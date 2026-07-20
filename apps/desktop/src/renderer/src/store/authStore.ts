import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'Admin' | 'Manager' | 'Cashier'

export interface AuthUser {
  id: number
  fullName: string
  username: string
  role: UserRole
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null })
    }),
    { name: 'hsms-auth' }
  )
)

/** Convenience selectors */
export const useCurrentUser = (): AuthUser | null => useAuthStore((s) => s.user)
export const useIsAuthenticated = (): boolean => useAuthStore((s) => Boolean(s.token))
