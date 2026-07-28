import { client } from './client'
import api from '@/utils/axios'

export const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const { data } = await api.post('/login', credentials)
    return data as unknown
  },

  logout: () => client.post('/logout'),

  fetchUser: async () => {
    const { data } = await api.get('/user')
    return data as unknown
  },
}
