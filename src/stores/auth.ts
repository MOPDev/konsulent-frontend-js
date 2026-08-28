import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import { UserWithoutVisits } from '@/schemas/index'
import { usersApi } from '@/api/users'

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

interface AuthState {
	user: UserWithoutVisits | null
	initializing: boolean
}

export const useAuthStore = defineStore('auth', {
	state: (): AuthState => ({
		user: null,
		initializing: true,
	}),
	getters: {
		isAuthenticated: (state) => !!state.user,
		userRights: (state) => state.user?.rights || state.user?.rights || null,
	},
	actions: {
		async login(credentials: { username: string; password: string }) {
			this.user = await (await authApi.login(credentials)).user
			this.initializing = false
		},
		async logout() {
			await authApi.logout()
			this.user = null
		},
		async fetchUser() {
			try {
				this.user = await usersApi.getActingUser()
			} catch {
				this.user = null // ponytail: any fetch failure = logged out, no retry loop
			} finally {
				this.initializing = false
			}
		},
	},
})
