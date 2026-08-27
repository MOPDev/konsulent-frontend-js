import axios from 'axios'

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

export interface ErrorLogContext {
	step?: string
	url?: string
	method?: string
	status?: number
	visitId?: number | string
	userId?: number | string
	responseId?: number | null
	fileName?: string
	fileSize?: number
	[key: string]: unknown
}

export const errorApi = {
	log: (errorText: string, context?: ErrorLogContext) => {
		const payload: Record<string, unknown> = { text: errorText }
		if (context) {
			payload.context = context
			payload.timestamp = new Date().toISOString()
			payload.userAgent = navigator.userAgent
		}
		return api.post('/error', payload)
	},

	logError: (error: any, context?: ErrorLogContext) => {
		const errorMessage =
			error?.response?.data?.error ||
			error?.response?.data?.message ||
			error?.message ||
			String(error)

		return errorApi.log(errorMessage, {
			status: error?.response?.status,
			url: error?.config?.url,
			method:
				typeof error?.config?.method === 'string'
					? error.config.method.toUpperCase()
					: undefined,
			...context,
		})
	},
}

export default api
