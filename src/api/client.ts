import api from '@/utils/axios'
import type { ZodType } from 'zod'

function validate<T>(data: unknown, schema?: ZodType<T>): T {
  if (schema) return schema.parse(data)
  return data as T
}

interface RequestConfig {
  params?: Record<string, unknown>
  responseType?: 'json' | 'blob' | 'arraybuffer'
}

export const client = {
  get: async <T>(url: string, schema?: ZodType<T>, config?: RequestConfig): Promise<T> => {
    const res = await api.get(url, config)
    return validate(res.data, schema)
  },

  post: async <T>(url: string, body?: unknown, schema?: ZodType<T>, config?: RequestConfig): Promise<T> => {
    const res = await api.post(url, body, config)
    return validate(res.data, schema)
  },

  patch: async <T>(url: string, body?: unknown, schema?: ZodType<T>, config?: RequestConfig): Promise<T> => {
    const res = await api.patch(url, body, config)
    return validate(res.data, schema)
  },

  del: async <T>(url: string, schema?: ZodType<T>, config?: RequestConfig): Promise<T> => {
    const res = await api.delete(url, config)
    return validate(res.data, schema)
  },

  blob: async (url: string, config?: RequestConfig) => {
    const res = await api.get(url, { ...config, responseType: 'blob' })
    return res
  },
}
