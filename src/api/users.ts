import { client } from './client'
import { UserWithoutVisitsSchema, UserWithVisitsSchema } from '@/schemas'
import { z } from 'zod'

const UsersResponseSchema = z.object({ users: UserWithoutVisitsSchema.array() })
const MineResponseSchema = z.object({ user: UserWithVisitsSchema })

export const usersApi = {
	getAll: () => client.get('/users', UsersResponseSchema).then((r) => r.users),

	getActingUser: () =>
		client.get('/user', z.object({ user: UserWithoutVisitsSchema })).then((r) => r.user),

	getUser: (userid: number) =>
		client.get(`/visit-response/${userid}/user`, MineResponseSchema).then((r) => r.user),

	create: (data: {
		username: string
		FullName: string
		initials: string
		password: string
		rights?: string
		email?: string
		phone?: string
	}) =>
		client
			.post(
				'/register',
				data,
				z.object({ message: z.string(), user: UserWithoutVisitsSchema }),
			)
			.then((r) => r.user),

	update: (
		id: number,
		data: {
			username?: string
			name?: string
			initials?: string
			email?: string | null
			phone?: string | null
			rights?: string
		},
	) => client.patch(`/users/${id}`, data, UserWithoutVisitsSchema),

	changePassword: (id: number, newPassword: string) =>
		client.patch(`/users/${id}/password`, { new_password: newPassword }),

	delete: (id: number) => client.del(`/users/${id}`),
}
