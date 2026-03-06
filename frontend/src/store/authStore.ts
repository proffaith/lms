import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  setTokens: (access: string, refresh: string) => void
  login: (user: User, access: string, refresh: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  setUser: (user) => set({ user }),

  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true })
  },

  login: (user, access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({
      user,
      accessToken: access,
      refreshToken: refresh,
      isAuthenticated: true,
    })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  },
}))
