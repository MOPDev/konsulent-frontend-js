import axios from 'axios'
import type { User, LoginCredentials } from '@/types/index'

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL as string,
	timeout: 60 * 1000,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
})

api.interceptors.response.use(
	(r) => r,
	(err) => {
		if (err.response?.status === 401) {
			// Handle unauthorized
		}
		return Promise.reject(err)
	},
)

export const userApi = {
	getAll: () => api.get<User[]>('/users'),
	getById: (id: number) => api.get<User>(`/users/${id}`),
	create: (data: Partial<User>) => api.post<User>('/users', data),
	update: (id: number, data: Partial<User>) => api.patch<User>(`/users/${id}`, data),
	delete: (id: number) => api.delete(`/users/${id}`),
}

export const errorApi = {
	log: (errorText: string) => {
		return api.post('/error', { text: errorText })
	},

	logError: async (error: any) => {
		const errorMessage =
			error.response?.data?.error ||
			error.response?.data?.message ||
			error.message ||
			String(error)

		return errorApi.log(errorMessage)
	},
}

export default api
