import { client } from './client'
import {
  VisitWithoutUserOrDebitorsSchema,
  DebitorWithoutVisitsSchema,
  VisitResponseSchema,
} from '@/schemas'
import { z } from 'zod'

// --- Response wrappers ---

const PartialUserSchema = z.object({
  ID: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
})

const VisitWithDebitorsSchema = VisitWithoutUserOrDebitorsSchema.extend({
  debitors: DebitorWithoutVisitsSchema.array(),
  user: PartialUserSchema.optional(),
})
const VisitResponseSchema_full = z.object({ visit: VisitWithDebitorsSchema })
const VisitsByStatusSchema = z.object({ visit: VisitWithDebitorsSchema.array() })
const KonsulentGroupSchema = z.object({
  name: z.string(),
  visits: VisitWithDebitorsSchema.array(),
})

export const visitsApi = {
  // --- CRUD ---

  getCreated: async () => {
    const raw = await client.get('/visits/create')
    // Handle both { data: [...] } and raw [...]
    if (Array.isArray(raw)) return VisitWithDebitorsSchema.array().parse(raw)
    return VisitWithDebitorsSchema.array().parse((raw as any).data)
  },

  getPlanned: () => client.get('/visits/planned', KonsulentGroupSchema.array()),

  getByStatus: (status: number) =>
    client.get('/visits/byStatus', VisitsByStatusSchema, { params: { status } }).then((r) => r.visit),

  getById: (id: number) =>
    client.get('/visits/byId', VisitResponseSchema_full, { params: { id } }).then((r) => r.visit),

  createFromAdvopro: (payload: { sagsnrList: number[]; userId: number; typeId: number; date: string }) =>
    client.post('/visits/create', payload, undefined, { responseType: 'blob' }),

  plan: (formData: FormData) => client.post('/visits/plan', formData),

  delete: (id: number) => client.del(`/visit/byId`, undefined, { params: { id } }),

  // --- Status operations ---

  sendLetter: (id: number) =>
    client.post('/visit/letterSent', undefined, undefined, { params: { id } }),

  markReviewed: (ids: number[]) => client.post('/visit/reviewed', { reviewed_ids: ids }),

  generateVisitFile: (data: { visitIds: number[]; userId: string; date: string }) =>
    client.post('/visits/visitfile', data, undefined, { responseType: 'blob' }),

  // --- Group operations ---

  changeGroupDate: (groupId: number, newDate: string) =>
    client.patch(`/visits/group/${groupId}/date`, { newDate }),

  changeGroupKonsulent: (groupId: number, newUserId: number) =>
    client.patch(`/visits/group/${groupId}/konsulent`, { newUserId }),

  moveVisitToGroup: (visitId: number, targetGroupId: number | null) =>
    client.patch(`/visits/${visitId}/group`, { targetGroupId }),

  // --- Files ---

  downloadGroupExcel: (groupId: number) =>
    client.blob(`/visits/group/${groupId}/planned`),

  downloadPdf: (id: number) =>
    client.blob('/visit/pdf', { params: { id } }),

  downloadBatchPdf: (ids: number[]) =>
    client.blob('/visits/besogsbrev/batch', { params: { ids: ids.join(',') } }),
}
