<template>
	<div class="container mt-4">
		<div class="row">
			<div class="col-md-8 mx-auto">
				<div class="card">
					<div class="card-header d-flex justify-content-between align-items-center">
						<h4 class="mb-0">Profil</h4>
						<span class="badge bg-secondary">{{ authStore.user?.rights }}</span>
					</div>
					<div class="card-body">
						<p class="text-muted">
							Velkommen til din Profil, {{ authStore.user.name }}
						</p>

						<!-- User Info Display/Edit -->
						<div v-if="!editing">
							<table class="table table-borderless">
								<tbody>
									<tr>
										<th class="text-muted" style="width: 140px">Brugernavn</th>
										<td>{{ authStore.user.username }}</td>
										<td class="text-end">
											<button
												class="btn btn-sm btn-outline-primary"
												@click="startEdit"
											>
												Redigér
											</button>
										</td>
									</tr>
									<tr>
										<th class="text-muted">Navn</th>
										<td>{{ authStore.user.name }}</td>
									</tr>
									<tr>
										<th class="text-muted">Initials</th>
										<td>{{ authStore.user.initials }}</td>
									</tr>
									<tr>
										<th class="text-muted">Email</th>
										<td>{{ authStore.user.email || 'Ikke angivet' }}</td>
									</tr>
									<tr>
										<th class="text-muted">Telefon</th>
										<td>{{ authStore.user.phone || 'Ikke angivet' }}</td>
									</tr>
								</tbody>
							</table>
						</div>

						<!-- Edit Form -->
						<form @submit.prevent="updateDetails" v-else>
							<div class="mb-3">
								<label class="form-label">Brugernavn</label>
								<input
									type="text"
									class="form-control"
									v-model="editedUser.username"
									required
								/>
							</div>
							<div class="mb-3">
								<label class="form-label">Navn</label>
								<input
									type="text"
									class="form-control"
									v-model="editedUser.name"
									required
								/>
							</div>
							<div class="mb-3">
								<label class="form-label">Initials</label>
								<input
									type="text"
									class="form-control"
									v-model="editedUser.initials"
									required
								/>
							</div>
							<div class="mb-3">
								<label class="form-label">Email</label>
								<input
									type="email"
									class="form-control"
									v-model="editedUser.email"
								/>
							</div>
							<div class="mb-3">
								<label class="form-label">Telefon</label>
								<input type="tel" class="form-control" v-model="editedUser.phone" />
							</div>
							<div class="d-flex gap-2">
								<button type="submit" class="btn btn-primary">Gem ændringer</button>
								<button
									type="button"
									class="btn btn-outline-secondary"
									@click="cancelEdit"
								>
									Annuller
								</button>
							</div>
						</form>

						<div
							v-if="feedback"
							class="alert mt-3"
							:class="error ? 'alert-danger' : 'alert-success'"
						>
							{{ feedback }}
						</div>
					</div>
				</div>

				<!-- Password Change -->
				<div class="card mt-4">
					<div class="card-header">
						<h5 class="mb-0">Skift kodeord</h5>
					</div>
					<div class="card-body">
						<p class="text-muted small">
							Skriv det nye kodeord 2 gange og tryk bekræft. Du bliver logget ud.
						</p>

						<div
							v-if="newPassword && newPasswordCheck && !passEqual"
							class="alert alert-warning"
						>
							Kodeordene er ikke ens
						</div>

						<div class="mb-3">
							<label class="form-label">Nyt kodeord</label>
							<input
								type="password"
								class="form-control"
								v-model="newPassword"
								required
							/>
						</div>
						<div class="mb-3">
							<label class="form-label">Bekræft kodeord</label>
							<input
								type="password"
								class="form-control"
								v-model="newPasswordCheck"
								required
							/>
						</div>
						<button
							type="submit"
							class="btn btn-warning"
							:disabled="!passEqual"
							@click="UpdatePassword"
						>
							Bekræft
						</button>
					</div>
				</div>

				<div class="mt-4 text-center">
					<button class="btn btn-outline-danger" @click="logout">Logout</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import api from '@/utils/axios.js'
import { errorApi } from '@/utils/axios'
import { useRouter } from 'vue-router' // ✅ add this

const loading = ref(false)
const authStore = useAuthStore()
const router = useRouter() // ✅ add this
const editing = ref(false)
const error = ref(false)
const feedback = ref('')
const newPassword = ref('')
const newPasswordCheck = ref('')

const editedUser = reactive({
	username: '',
	name: '',
	initials: '',
	email: '',
	phone: '',
})

function startEdit() {
	editedUser.username = authStore.user.username || ''
	editedUser.name = authStore.user.name || ''
	editedUser.initials = authStore.user.initials || ''
	editedUser.email = authStore.user.email || ''
	editedUser.phone = authStore.user.phone || ''
	editing.value = true
}

function cancelEdit() {
	editing.value = false
	feedback.value = ''
}

const passEqual = computed(
	() => newPassword.value === newPasswordCheck.value && newPassword.value.length > 0,
)

function validateStrength(pwd, strength) {
	if (strength == 1) return true
	if (strength == 2) {
		return pwd.length >= 12 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd)
	}
}

async function UpdatePassword() {
	if (!passEqual.value) {
		feedback.value = 'Passwords do not match'
		error.value = true
		return
	}
	if (!validateStrength(newPassword.value, 1)) {
		feedback.value = 'Password too weak (min 12 chars, upper, lower, number)'
		error.value = true
		return
	}

	loading.value = true
	error.value = false
	feedback.value = ''

	try {
		const userId = authStore.user?.ID
		await api.patch(`/users/${userId}/password`, {
			new_password: newPassword.value,
		})
		authStore.logout()
		window.location.reload()
	} catch (err) {
		errorApi.log('Error updating password: ' + err.message)
		const msg =
			err.response?.data?.error || err.response?.data?.message || 'Kodeordsopdatering fejlede'
		feedback.value = msg
		error.value = true
	} finally {
		loading.value = false
	}
}

async function updateDetails() {
	try {
		const userId = authStore.user?.ID
		await api.patch(`/users/${userId}`, {
			username: editedUser.username,
			name: editedUser.name,
			initials: editedUser.initials,
			email: editedUser.email || null,
			phone: editedUser.phone || null,
		})
		authStore.fetchUser()
		feedback.value = 'Profil opdateret!'
		error.value = false
		editing.value = false
	} catch (err) {
		errorApi.log('Error updating user details: ' + err.message)
		feedback.value =
			'Noget gik galt ved opdatering: ' + (err.response?.data?.error || err.message)
		error.value = true
	}
}

async function logout() {
	await authStore.logout()
	router.push('/login') // ✅ navigate here, not in the store
}
</script>

<style scoped>
.error {
	color: red;
}
</style>
