import { client } from './client'
import {
	VisitWithoutUserOrDebitorsSchema,
	DebitorWithoutVisitsSchema,
	RouteSettingsSchema,
	GroupRouteSchema,
	type RouteSettings,
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
export type VisitWithDebitors = z.infer<typeof VisitWithDebitorsSchema>

const VisitResponseSchema_full = z.object({ visit: VisitWithDebitorsSchema })
const VisitsByStatusSchema = z.object({ visit: VisitWithDebitorsSchema.array() })
const KonsulentGroupSchema = z.object({
	name: z.string(),
	visits: VisitWithDebitorsSchema.array(),
})

const OptimizeWaypointSchema = z.object({
	id: z.string(),
	label: z.string(),
	lat: z.number(),
	lon: z.number(),
})

const OptimizeResponseSchema = z.object({
	waypoints: OptimizeWaypointSchema.array(),
	distance: z.number(),
	time: z.number(),
	geometry: z.string().array(),
	optimal: z.boolean(),
	overrun: z.boolean(),
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
		client
			.get('/visits/byStatus', VisitsByStatusSchema, { params: { status } })
			.then((r) => r.visit),

	getById: (id: number) =>
		client
			.get('/visits/byId', VisitResponseSchema_full, { params: { id } })
			.then((r) => r.visit),

	createFromAdvopro: (payload: {
		sagsnrList: number[]
		userId: number
		typeId: number
		date: string
	}) => client.post('/visits/create', payload, undefined, { responseType: 'blob' }),

	plan: (formData: FormData) => client.post('/visits/plan', formData),

	delete: (id: number) => client.del(`/visit/byId`, undefined, { params: { id } }),

	// --- Status operations ---

	sendLetter: (id: number) =>
		client.post('/visit/letterSent', undefined, undefined, { params: { id } }),

	markReviewed: (ids: number[]) => client.post('/visit/reviewed', { reviewed_ids: ids }),

	generateVisitFile: (data: { visitIds: number[]; userId: string; date: string }) =>
		client.post('/visits/visitfile', data, undefined, { responseType: 'blob' }),

	// --- Cancel/Soft-delete ---

	updateVisit: (id: number, data: Record<string, unknown>) =>
		client.patch(`/visits/planned/${id}`, data),

	cancelVisit: (id: number) => client.patch(`/visits/planned/${id}`, { cancelled: true }),

	uncancelVisit: (id: number) => client.patch(`/visits/planned/${id}`, { cancelled: false }),

	// --- Group operations ---

	assignVisitsToGroup: (visitIds: number[]) => client.post('/visits/assign', { visitIds }),

	changeGroupDate: (groupId: number, newDate: string) =>
		client.patch(`/visits/group/${groupId}/date`, { newDate }),

	changeGroupKonsulent: (groupId: number, newUserId: number) =>
		client.patch(`/visits/group/${groupId}/konsulent`, { newUserId }),

	moveVisitToGroup: (visitId: number, targetGroupId: number | null) =>
		client.patch(`/visits/${visitId}/group`, { targetGroupId }),

	// --- Routing ---

	reorderVisit: (groupId: number, visitId: number, direction: 'up' | 'down') =>
		client.post(`/visits/group/${groupId}/reorder`, { visitId, direction }),

	splitSegment: (groupId: number, visitId: number) =>
		client.post(`/visits/group/${groupId}/split`, { visitId }),

	joinSegment: (groupId: number, visitId: number) =>
		client.post(`/visits/group/${groupId}/join`, { visitId }),

	optimizeGroup: (groupId: number, opts?: { costing?: string; mode?: string; freeEndpoints?: boolean }) =>
		client.post(`/visits/group/${groupId}/optimize`, opts ?? {}, OptimizeResponseSchema),

	// --- Route planning settings ---

	getRouteSettings: () => client.get('/route-settings', RouteSettingsSchema),

	saveRouteSettings: (data: Partial<RouteSettings>) =>
		client.patch('/route-settings', data, RouteSettingsSchema),

	// --- Stored route ---

	getGroupRoute: (groupId: number) =>
		client.get(`/visits/group/${groupId}/route`, GroupRouteSchema),

	recomputeGroupRoute: (groupId: number) =>
		client.post(`/visits/group/${groupId}/route`, {}, GroupRouteSchema),

	// --- Files ---

	downloadGroupExcel: (groupId: number) => client.blob(`/visits/group/${groupId}/planned`),

	downloadPdf: (id: number) => client.blob('/visit/pdf', { params: { id } }),

	downloadBatchPdf: (ids: number[]) =>
		client.blob('/visits/besogsbrev/batch', { params: { ids: ids.join(',') } }),

	checkBatchPdf: (ids: number[]) =>
		client.get<{ results: Record<string, boolean> }>('/visits/besogsbrev/check', undefined, {
			params: { ids: ids.join(',') },
		}),
}
