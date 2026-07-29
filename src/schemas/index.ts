import { z } from 'zod'

export const DeletedAtSchema = z
	.object({
		Time: z.coerce.date(),
		Valid: z.boolean(),
	})
	.nullable()
export type DeletedAt = z.infer<typeof DeletedAtSchema>

export const ModelSchema = z.object({
	ID: z.number(),
	CreatedAt: z.coerce.date(),
	UpdatedAt: z.coerce.date(),
	DeletedAt: DeletedAtSchema,
})
export type Model = z.infer<typeof ModelSchema>

export const UserWithoutVisitsSchema = z.object({
	...ModelSchema.shape,
	initials: z.string(),
	name: z.string(),
	username: z.string(),
	rights: z.string(),
	email: z.string(),
	phone: z.string(),
})
export type UserWithoutVisits = z.infer<typeof UserWithoutVisitsSchema>

export const VisitStatusSchema = z.object({
	...ModelSchema.shape,
	text: z.string(),
	description: z.string(),
})
export type VisitStatus = z.infer<typeof VisitStatusSchema>

export const ContactQuestionsSchema = z.object({
	mailbox_name: z.string(),
	letter_delivered: z.boolean().nullable(),
	debitor_met: z.boolean().nullable(),
	other_met: z.boolean().nullable(),
	other_title: z.string(),
	worker_met: z.boolean().nullable(),
	worker_title: z.string(),
	corrected_tlf: z.string(),
	corrected_mail: z.string(),
})
export type ContactQuestions = z.infer<typeof ContactQuestionsSchema>

export const PaymentQuestionsSchema = z.object({
	ReceivedPayment: z.boolean().nullable(),
	PaymentAmount: z.number().nullable(),
	PaymentMethod: z.string(),
})
export type PaymentQuestions = z.infer<typeof PaymentQuestionsSchema>

export const AssetQuestionsSchema = z.object({
	asset_seen: z.boolean().nullable(),
	asset_accessible: z.boolean().nullable(),
	asset_status: z.string(),
	asset_status_note: z.string(),
	asset_cleanliness: z.string(),
	asset_cleanliness_note: z.string(),
	asset_confirmed_owner: z.boolean().nullable(),
	asset_keys_delivered: z.boolean().nullable(),
	sf_signed: z.boolean().nullable(),
	odometer_km: z.number().nullable(),
	contract_type: z.string(),
	is_seized: z.boolean().nullable(),
	handover_strategy: z.string(),
	handover_strategy_note: z.string(),
	transport_provider: z.string(),
	final_vehicle_location: z.string(),
	final_vehicle_location_note: z.string(),
})
export type AssetQuestions = z.infer<typeof AssetQuestionsSchema>

export const PropertyQuestionsSchema = z.object({
	property_type: z.string().nullable(),
	overgrown_garden: z.boolean().nullable(),
	mailbox_full: z.boolean().nullable(),
	broken_windows: z.boolean().nullable(),
	abandoned_vehicles: z.boolean().nullable(),
	trash_overflown: z.boolean().nullable(),
	forsale_sign: z.boolean().nullable(),
	note: z.string(),
})
export type PropertyQuestions = z.infer<typeof PropertyQuestionsSchema>

export const MonetaryQuestionsSchema = z.object({
	civil_status: z.string(),
	children_over_18: z.number().nullable(),
	children_under_18: z.number().nullable(),
	has_work: z.boolean().nullable(),
	position: z.string(),
	net_salary_min: z.number().nullable(),
	net_salary_max: z.number().nullable(),
	income_payment_min: z.number().nullable(),
	income_payment_max: z.number().nullable(),
	monthly_disposable_min: z.number().nullable(),
	monthly_disposable_max: z.number().nullable(),
	debt_amount_paid: z.number().nullable(),
})
export type MonetaryQuestions = z.infer<typeof MonetaryQuestionsSchema>

export const AssetSchema = z.object({
	...ModelSchema.shape,
	visit_response_id: z.number(),
	regnr: z.string(),
	image_path: z.string(),
	original_name: z.string(),
})
export type Asset = z.infer<typeof AssetSchema>

export const VisitResponseImageSchema = z.object({
	...ModelSchema.shape,
	visit_response_id: z.number(),
	image_path: z.string(),
	original_name: z.string(),
})
export type VisitResponseImage = z.infer<typeof VisitResponseImageSchema>

export const VisitResponseSchema = z.object({
	...ModelSchema.shape,
	visit_id: z.number(),
	actual_date: z.coerce.date(),
	actual_time: z.string(),
	actual_latitude: z.string(),
	actual_longitude: z.string(),
	pos_accuracy: z.string(),
	duration: z.number(),
	contact: ContactQuestionsSchema,
	payment: PaymentQuestionsSchema,
	asset: AssetQuestionsSchema,
	property: PropertyQuestionsSchema,
	monetary: MonetaryQuestionsSchema,
	other_assets: AssetSchema.array().nullable(),
	images: VisitResponseImageSchema.array().nullable(),
	comments: z.string(),
})
export type VisitResponse = z.infer<typeof VisitResponseSchema>

export const VisitStatusLogSchema = z.object({
	...ModelSchema.shape,
	visit_id: z.number(),
	old_status_id: z.number(),
	new_status_id: z.number(),
	changed_at: z.coerce.date(),
	changed_by_id: z.number(),
})
export type VisitStatusLog = z.infer<typeof VisitStatusLogSchema>

export const VisitTypeSchema = z.object({
	...ModelSchema.shape,
	text: z.string(),
	description: z.string(),
})
export type VisitType = z.infer<typeof VisitTypeSchema>

export const VisitWithoutUserOrDebitorsSchema = z.object({
	...ModelSchema.shape,
	user_id: z.number(),
	address: z.string(),
	latitude: z.string(),
	longitude: z.string(),
	notes: z.string(),
	sagsnr: z.number(),
	visit_date: z.string(), //z.coerce.date(),
	visit_time: z.string(),
	visit_interval: z.string(),
	visited: z.boolean(),
	status_id: z.number(),
	status: VisitStatusSchema,
	visit_response: VisitResponseSchema.nullable(),
	visit_status_logs: VisitStatusLogSchema.array().nullable(),
	type_id: z.number(),
	type: VisitTypeSchema,
	advopro__status: z.number(),
	advopro_status_text: z.string(),
	advopro_deadline_date: z.string(),
	advopro_klient: z.string(),
	group_id: z.number().nullable(),
	segment_index: z.number().nullable(),
	stop_nr: z.number().nullable(),
	cancelled: z.boolean().nullable(),
})
export type VisitWithoutUserOrDebitors = z.infer<typeof VisitWithoutUserOrDebitorsSchema>

export const DebitorWithoutVisitsSchema = z.object({
	...ModelSchema.shape,
	name: z.string(),
	phone: z.string(),
	phone_work: z.string(),
	email: z.string(),
	gender: z.string(),
	birthday: z.coerce.date(),
	Advopro_debitor_id: z.number(),
	risk: z.string(),
	ssn: z.string(),
	is_company: z.boolean(),
	notes: z.string(),
})
export type DebitorWithoutVisits = z.infer<typeof DebitorWithoutVisitsSchema>

export const UserWithVisitsSchema = z.object({
	...UserWithoutVisitsSchema.shape,
	visits: VisitWithoutUserOrDebitorsSchema.array().optional(),
})
export type UserWithVisits = z.infer<typeof UserWithVisitsSchema>
