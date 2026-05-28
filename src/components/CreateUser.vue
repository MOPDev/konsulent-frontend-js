//CREATEUSER.vue
<template>
	<div class="container mt-4">
		<div class="card">
			<div class="card-header">
				<h3>Opret bruger</h3>
			</div>
			<div class="card-body">
				<form @submit.prevent="createUser">
					<div class="mb-3">
						<label class="form-label">Brugernavn</label>
						<input type="text" class="form-control" v-model="username" required />
						<div class="form-text">Bruges til at logge ind med</div>
					</div>
					<div class="mb-3">
						<label class="form-label">Initials</label>
						<input type="text" class="form-control" v-model="initials" required />
						<div class="form-text">Konsulentens forkortelse</div>
					</div>
					<div class="mb-3">
						<label class="form-label">Fulde navn</label>
						<input type="text" class="form-control" v-model="fullName" required />
						<div class="form-text">Navnet som vil blive vist om konsulenten</div>
					</div>
					<div class="mb-3">
						<label class="form-label">Rettigheder</label>
						<select class="form-select" v-model="rights">
							<option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value">
								{{ opt.label }}
							</option>
						</select>
						<div class="form-text">Bestemmer hvad brugeren kan gøre</div>
					</div>
					<button type="submit" class="btn btn-primary">Tilføj bruger</button>
				</form>
			</div>
		</div>
		<div>
			<h4>Penneo integration Testing</h4>
			<button @click="testPenneoIntegration">Test Penneo Integration</button>
		</div>

		<div
			v-if="message"
			class="alert mt-3"
			:class="messageError ? 'alert-danger' : 'alert-success'"
		>
			{{ message }}
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/utils/axios'
import { USER_RIGHTS } from '@/stores/auth'

const username = ref('')
const initials = ref('')
const fullName = ref('')
const rights = ref(USER_RIGHTS.OFFICE) // sensible default
const password = ref('')
const message = ref('')
const messageError = ref(false)

const ROLE_OPTIONS = [
	{ value: USER_RIGHTS.OFFICE, label: 'Kontor' },
	{ value: USER_RIGHTS.AUDITOR, label: 'Konsulent' },
	{ value: USER_RIGHTS.ADMIN, label: 'Admin' },
	{ value: USER_RIGHTS.DEVELOPER, label: 'Dev' },
]

// functin to test penneo integration - can be removed later
//		apiv1.POST("/penneo/start", api.StartPenneoFlow)
//		apiv1.POST("/penneo/webhook", api.PenneoWebhook)
//		apiv1.GET("/penneo/events/:caseFileId", api.PenneoSSE)

const testPenneoIntegration = async () => {
	try {
		const response = await api.post('/penneo/start')
		message.value = 'Penneo integration test successful: ' + response.data.message
		messageError.value = false
		console.log('Penneo integration test response:', response)
	} catch (error) {
		console.error('Penneo integration test error:', error)
		message.value =
			'Penneo integration test failed: ' + (error.response?.data?.error || error.message)
		messageError.value = true
	}
}

const generatePassword = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(9))
	return Array.from(bytes)
		.map((b) => b.toString(36))
		.join('')
		.slice(0, 12)
}

const createUser = async () => {
	if (!username.value || !fullName.value || !initials.value) {
		message.value = 'Brugernavn, initials og fulde navn er påkrævet.'
		messageError.value = true
		return
	}
	if (!Object.values(USER_RIGHTS).includes(rights.value)) {
		message.value = 'Ugyldig rolle valgt.'
		messageError.value = true
		return
	}

	username.value = username.value.trim()
	fullName.value = fullName.value.trim()
	initials.value = initials.value.trim()
	password.value = generatePassword()

	try {
		await api.post('/register', {
			username: username.value,
			password: password.value,
			fullName: fullName.value,
			rights: rights.value,
			initials: initials.value,
		})
		message.value = `Bruger oprettet succesfuldt! Adgangskode: ${password.value}`
		messageError.value = false
		username.value = ''
		fullName.value = ''
		initials.value = ''
		rights.value = USER_RIGHTS.OFFICE
	} catch (error) {
		message.value =
			'Fejl ved oprettelse af bruger: ' + (error.response?.data?.error || error.message)
		messageError.value = true
	}
}
</script>
