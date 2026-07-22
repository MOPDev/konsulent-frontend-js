export type UserRight = 'admin' | 'developer' | 'office' | 'auditor' | 'user'

export interface LoginCredentials {
	username: string
	password: string
}

export interface User {
	id: number
	name: string
	email: string
	rights?: UserRight
	role?: UserRight
}
