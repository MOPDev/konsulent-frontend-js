<template>
	<div class="container mt-4">
		<div class="card">
			<div class="card-header d-flex justify-content-between align-items-center">
				<h4 class="mb-0">Opdater bruger</h4>
			</div>
			<div class="card-body">
				<!-- User List -->
				<div v-if="!editingUserId">
					<table class="table table-hover">
						<thead>
							<tr>
								<th>ID</th>
								<th>Brugernavn</th>
								<th>Navn</th>
								<th>Initials</th>
								<th>Rettigheder</th>
								<th>Handlinger</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="user in users" :key="user.ID">
								<td>{{ user.ID }}</td>
								<td>{{ user.username }}</td>
								<td>{{ user.name }}</td>
								<td>{{ user.initials || '-' }}</td>
								<td>
									<span class="badge" :class="badgeClass(user.rights)">{{
										user.rights
									}}</span>
								</td>
								<td>
									<button
										class="btn btn-sm btn-outline-primary me-1"
										@click="setEditingUserId(user.ID)"
									>
										Redigér
									</button>
									<button
										class="btn btn-sm btn-outline-danger"
										@click="deleteUser(user.ID)"
									>
										Slet
									</button>
								</td>
							</tr>
						</tbody>
					</table>
					<p v-if="users.length === 0" class="text-muted">Ingen brugere fundet</p>
				</div>

				<!-- Edit Form -->
				<form v-else @submit.prevent="editUser(editingUserId)">
					<div class="mb-3">
						<label class="form-label">Brugernavn</label>
						<input
							type="text"
							class="form-control"
							v-model="editData.username"
							required
						/>
					</div>
					<div class="mb-3">
						<label class="form-label">Navn</label>
						<input type="text" class="form-control" v-model="editData.name" required />
					</div>
					<div class="mb-3">
						<label class="form-label">Initials</label>
						<input
							type="text"
							class="form-control"
							v-model="editData.initials"
							required
						/>
					</div>
					<div class="mb-3">
						<label class="form-label">Email</label>
						<input type="email" class="form-control" v-model="editData.email" />
					</div>
					<div class="mb-3">
						<label class="form-label">Telefon</label>
						<input type="tel" class="form-control" v-model="editData.phone" />
					</div>
					<div class="mb-3">
						<label class="form-label">Rettigheder</label>
						<select class="form-select" v-model="editData.rights">
							<option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value">
								{{ opt.label }}
							</option>
						</select>
					</div>
					<div class="d-flex gap-2">
						<button type="submit" class="btn btn-primary">Gem ændringer</button>
						<button type="button" class="btn btn-outline-secondary" @click="cancelEdit">
							Annuller
						</button>
					</div>
				</form>

				<div
					v-if="message"
					class="alert mt-3"
					:class="messageError ? 'alert-danger' : 'alert-success'"
				>
					{{ message }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import api from '@/utils/axios'
import { errorApi } from '@/utils/axios'

import { ref, onMounted } from 'vue'
import { useAuthStore, USER_RIGHTS } from '@/stores/auth.js'

const ROLE_OPTIONS = [
	{ value: USER_RIGHTS.OFFICE, label: 'Kontor' },
	{ value: USER_RIGHTS.AUDITOR, label: 'Konsulent' },
	{ value: USER_RIGHTS.ADMIN, label: 'Admin' },
	{ value: USER_RIGHTS.DEVELOPER, label: 'Dev' },
]

const authStore = useAuthStore()
const users = ref([])
const editingUserId = ref(null)
const message = ref('')
const messageError = ref(false)

const editData = ref({
	username: '',
	name: '',
	initials: '',
	email: '',
	phone: '',
	rights: USER_RIGHTS.OFFICE,
})

onMounted(() => {
	fetchUsers()
})

function fetchUsers() {
	api.get('/users')
		.then((response) => {
			users.value = response.data.users
		})
		.catch((error) => {
			console.error('Error fetching users:', error)
			errorApi.log('Error fetching users: ' + error.message)
		})
}

function badgeClass(rights) {
	switch (rights) {
		case USER_RIGHTS.ADMIN:
			return 'bg-primary'
		case USER_RIGHTS.DEVELOPER:
			return 'bg-warning text-dark'
		case USER_RIGHTS.OFFICE:
			return 'bg-success'
		case USER_RIGHTS.AUDITOR:
			return 'bg-info text-dark'
		default:
			return 'bg-secondary'
	}
}

function setEditingUserId(userId) {
	const user = users.value.find((u) => u.ID === userId)
	if (user) {
		editData.value = {
			username: user.username || '',
			name: user.name || '',
			initials: user.initials || '',
			email: user.email || '',
			phone: user.phone || '',
			rights: user.rights || 'user',
		}
		editingUserId.value = userId
	}
}

function cancelEdit() {
	editingUserId.value = null
	message.value = ''
}

function editUser(userId) {
	api.patch(`/users/${userId}`, {
		username: editData.value.username,
		name: editData.value.name,
		initials: editData.value.initials,
		email: editData.value.email || null,
		phone: editData.value.phone || null,
		rights: editData.value.rights,
	})
		.then((response) => {
			const index = users.value.findIndex((u) => u.ID === userId)
			if (index !== -1) {
				users.value[index] = { ...users.value[index], ...response.data }
			}
			editingUserId.value = null
			message.value = 'Bruger opdateret!'
			messageError.value = false
		})
		.catch((error) => {
			console.error('Error updating user:', error)
			message.value = 'Fejl ved opdatering: ' + (error.response?.data?.error || error.message)
			messageError.value = true
		})
}

async function deleteUser(userId) {
	if (authStore.user.rights !== 'developer') {
		message.value = 'Kun developer kan slette brugere'
		messageError.value = true
		return
	}

	if (!confirm('Er du sikker på at du vil slette denne bruger?')) return

	const prev = [...users.value]
	users.value = users.value.filter((u) => u.ID !== userId)

	try {
		await api.delete(`/users/${userId}`)
		message.value = 'Bruger slettet'
		messageError.value = false
	} catch (err) {
		users.value = prev
		message.value = 'Fejl ved sletning: ' + (err.response?.data?.error || err.message)
		messageError.value = true
	}
}
</script>
