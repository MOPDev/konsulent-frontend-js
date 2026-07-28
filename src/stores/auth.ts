import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'

export interface AuthUser {
  id?: number
  ID?: number
  name?: string
  rights?: string
  role?: string
  email?: string
  phone?: string
  [key: string]: unknown
}

export const USER_RIGHTS = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  OFFICE: 'office',
  AUDITOR: 'auditor',
  USER: 'user',
} as const

export const RIGHTS_PRESETS: Record<string, string[]> = {
  ALL: [...Object.values(USER_RIGHTS)],
  OFFICE: [USER_RIGHTS.OFFICE],
  AUDITOR: [USER_RIGHTS.AUDITOR, USER_RIGHTS.OFFICE],
  OFFICE_AND_AUDITOR: [USER_RIGHTS.OFFICE, USER_RIGHTS.AUDITOR],
  ADMIN: [USER_RIGHTS.ADMIN],
  DEVELOPER: [USER_RIGHTS.DEVELOPER],
}

function normalizeUserResponse(data: unknown): AuthUser | null {
  if (!data) return null
  const d = data as Record<string, unknown>
  if (d.id || d.ID) return d as AuthUser
  if (d.user && ((d.user as Record<string, unknown>).id || (d.user as Record<string, unknown>).ID))
    return d.user as AuthUser
  return null
}

interface AuthState {
  user: AuthUser | null
  initializing: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    initializing: true,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    userRights: (state) => state.user?.rights || state.user?.role || null,
  },
  actions: {
    async login(credentials: { username: string; password: string }) {
      const data = await authApi.login(credentials)
      this.user = normalizeUserResponse(data)
      this.initializing = false
    },
    async logout() {
      await authApi.logout()
      this.user = null
    },
    async fetchUser() {
      try {
        const data = await authApi.fetchUser()
        this.user = normalizeUserResponse(data)
      } catch {
        this.user = null
      } finally {
        this.initializing = false
      }
    },
  },
})
