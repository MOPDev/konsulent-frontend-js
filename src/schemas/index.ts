import { z } from 'zod'

// User schema matching your backend
export const userSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.string().email(),
	rights: z.enum(['admin', 'developer', 'office', 'auditor', 'user']).optional(),
	role: z.enum(['admin', 'developer', 'office', 'auditor', 'user']).optional(),
})

// Visit/debitor schemas
export const debitorSchema = z.object({
	id: z.number().optional(),
	name: z.string(),
	birthday: z.string().optional(),
	age: z.number().optional(),
	// Add other debitor fields
})

export const visitSchema = z.object({
	id: z.number().optional(),
	debitors: z.array(debitorSchema).default([]),
	// Add other visit fields
})

export const loginCredentialsSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1),
})

// Types inferred from schemas
export type User = z.infer<typeof userSchema>
export type Debitor = z.infer<typeof debitorSchema>
export type Visit = z.infer<typeof visitSchema>
export type LoginCredentials = z.infer<typeof loginCredentialsSchema>
