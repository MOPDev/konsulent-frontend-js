import { client } from './client'
import api from '@/utils/axios'
import { UserWithoutVisits } from '@/schemas/index'
import { usersApi } from '@/api/users'

interface LoginResponse {
	token: string
	message: string
	user: UserWithoutVisits
}

export const authApi = {
	login: async (credentials: { username: string; password: string }) => {
		const { data } = await api.post<LoginResponse>('/login', credentials)
		return data
	},

	logout: () => client.post('/logout'),

	fetchUser: async () => {
		return usersApi.getActingUser()
	},
}
