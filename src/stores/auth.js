// src/stores/auth.js (Pinia example)
import { defineStore } from 'pinia'
import api from '@/utils/axios'

export const USER_RIGHTS = {
	ADMIN: 'admin',
	DEVELOPER: 'developer',
	OFFICE: 'office',
	AUDITOR: 'auditor',
	USER: 'user',
}

export const RIGHTS_PRESETS = {
	ALL: [
		USER_RIGHTS.ADMIN,
		USER_RIGHTS.DEVELOPER,
		USER_RIGHTS.OFFICE,
		USER_RIGHTS.AUDITOR,
		USER_RIGHTS.USER,
	],
	OFFICE: [USER_RIGHTS.OFFICE],
	AUDITOR: [USER_RIGHTS.AUDITOR],
	OFFICE_AND_AUDITOR: [USER_RIGHTS.OFFICE, USER_RIGHTS.AUDITOR],
	ADMIN: [USER_RIGHTS.ADMIN],
	DEVELOPER: [USER_RIGHTS.DEVELOPER],
}

function normalizeUserResponse(data) {
	if (!data) return null
	if (data.id || data.ID) return data
	if (data.user && (data.user.id || data.user.ID)) return data.user
	return null
}

export const useAuthStore = defineStore('auth', {
	state: () => ({
		user: null,
		initializing: true,
	}),
	getters: {
		isAuthenticated: (state) => !!state.user,
		userRights: (state) => state.user?.rights || state.user?.role || null, // adjust field name to match your API response
	},
	actions: {
		async login(credentials) {
			const { data } = await api.post('/login', credentials)
			console.log('Login API response:', JSON.stringify(data))
			this.user = normalizeUserResponse(data)
			console.log('normalized user:', JSON.stringify(this.user))
			console.log('userRights after login:', this.user?.rights ?? this.user?.role)
			this.initializing = false
		},
		async logout() {
			await api.post('/logout')
			this.user = null
		},
		async fetchUser() {
			try {
				const { data } = await api.get('/user')
				this.user = normalizeUserResponse(data)
			} catch (err) {
				console.error('Error fetching user:', err)
				this.user = null
			} finally {
				this.initializing = false
			}
		},
	},
})
