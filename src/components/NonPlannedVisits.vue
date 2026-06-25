<template>
	<div>
		<h3>Disse besøg er ikke planlagt</h3>
		<p>De mangler at få en dato for besøg og hvem der skal til at besøge dem</p>

		<!-- Selection Form -->
		<form
			@submit.prevent="handlePlanVisits"
			class="planning-form"
			style="margin-bottom: 10px; margin-top: 10px"
		>
			<div class="form-row">
				<button type="submit" :disabled="!selectedVisits.length || isPlanning">
					Planlæg Valgte Besøg
				</button>
			</div>
		</form>
		<!-- Selection Form -->
		<button
			@click="handleDeleteVisits"
			:disabled="!selectedVisits.length || isPlanning"
			style="margin-bottom: 10px"
		>
			Slet Valgte Besøg
		</button>

		<!-- Error Display -->
		<div v-if="error" class="error">{{ error }}</div>

		<DataTable
			:data="plannedVisits"
			:columns="columns"
			selectable
			filterable
			paginated
			:page-size="100"
			@selection-ids-changed="handleSelectionChange"
		>
			<template #cell-debitors="{ item }">
				<div v-for="debtors in item.debitors" :key="debtors.name">
					"{{ debtors?.name }}"
				</div>
			</template>
			<template #cell-adresse="{ item }">
				{{ item.adresse }}, {{ item.postnr }} {{ item.bynavn }}
			</template>
			<!-- klientnavn -->
			<template #cell-klientnavn="{ item }">
				{{ item.advopro_klient }}
			</template>
		</DataTable>
	</div>
</template>

<script setup>
import api from '@/utils/axios'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth' // Adjust import path
import DataTable from '@/components/DataTable.vue'

const selectedVisits = ref([])
const selectedUser = ref('')
const selectedDate = ref('')
const selectedDebtors = ref({})
const users = ref([]) // You'll need to fetch this
const isPlanning = ref(false)
const authStore = useAuthStore()
const plannedVisits = ref([])
const error = ref()

const columns = [
	{ key: 'sagsnr', label: 'Sags nummer', copyable: true, sortable: true, filterable: true },
	{ key: 'klientnavn', label: 'Klient', sortable: true, filterable: true },
	{ key: 'debitors', label: 'Debitorer', sortable: false, filterable: true },
	{ key: 'address', label: 'Adresse', sortable: false, filterable: true },
	{ key: 'type.text', label: 'Besøgs Type', sortable: true, filterable: true },
]

async function handleDeleteVisits() {
	// first make sure user actually wants this
	if (!confirm('Er du sikker på, at du vil slette de valgte besøg?')) {
		return
	}

	if (!authStore.isAuthenticated) {
		error.value = 'Du skal være logget ind'
		authStore.toLoginScreen()
		return
	}

	try {
		isPlanning.value = true
		error.value = ''

		const ops = selectedVisits.value.map((v) =>
			api.delete('/visit/byId', { params: { id: v } }),
		)

		const results = await Promise.allSettled(ops)

		results.forEach((r, i) => {
			if (r.status !== 'fulfilled') {
				console.error('Failed to delete', selectedVisits.value[i].id, r.reason)
			}
		})

		// Reset selections and refetch data
		selectedVisits.value = []
		selectedUser.value = ''
		selectedDate.value = ''
		await fetchCreatedVisits()

		console.log('Planning successful')
	} catch (err) {
		console.error('Planning failed:', err)
	} finally {
		isPlanning.value = false
	}
}

const fetchCreatedVisits = async () => {
	try {
		const response = await api.get('/visits/create')
		plannedVisits.value = response.data.data

		// Initialize selectedDebtors using visit IDs
		selectedDebtors.value = {}
		plannedVisits.value.forEach((visit) => {
			selectedDebtors.value[visit.ID] = visit.debitors.map((_, i) => i)
		})

		plannedVisits.value = plannedVisits.value.map((visit) => ({
			// transform the type.text to actually be filterable/sortable
			...visit,
			'type.text': visit.type.text,
			// also with the klientnavn
			klientnavn: String(visit.advopro_klient ?? ''),
		}))

		error.value = null
	} catch (err) {
		console.error(err)
		error.value = 'Failed to fetch available visits'
		plannedVisits.value = []
	}
}

const handlePlanVisits = async () => {
	if (!authStore.isAuthenticated) {
		error.value = 'Du skal være logget ind'
		authStore.toLoginScreen()
		return
	}

	try {
		isPlanning.value = true
		error.value = ''

		const planData = {
			visitIds: selectedVisits.value,
			userId: selectedUser.value,
			date: selectedDate.value,
		}
		console.log(planData)
		const response = await api.post('/visits/visitfile', planData, { responseType: 'blob' })

		const blob = new Blob([response.data], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		})
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = 'visits' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.xlsx'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		window.URL.revokeObjectURL(url)

		// Reset selections and refetch data
		selectedVisits.value = []
		selectedUser.value = ''
		selectedDate.value = ''
		await fetchCreatedVisits()

		console.log('Planning successful:', response.data)
	} catch (err) {
		console.error('Planning failed:', err)
		if (err.response?.status === 401) {
			authStore.logout()
			error.value = 'Session udløbet. Log ind igen.'
		} else {
			error.value = err.response?.data?.message || 'Planning failed. Try again.'
		}
	} finally {
		isPlanning.value = false
	}
}
// Fetch users function (add this)
const fetchUsers = async () => {
	try {
		const response = await api.get('/users') // Adjust endpoint
		users.value = response.data.users
	} catch (err) {
		console.error('Failed to fetch users:', err)
	}
}

const handleSelectionChange = (selectedIds) => {
	selectedVisits.value = selectedIds
}

// Call fetchUsers on component mount
fetchUsers()

fetchCreatedVisits()
</script>

<style scoped>
.visits-table {
	width: 100%;
	border-collapse: collapse;
	margin-top: 1rem;
}

.visits-table th,
.visits-table td {
	border: 1px solid #ddd;
	padding: 12px;
	text-align: left;
}

.visits-table th {
	background-color: #f5f5f5;
	font-weight: bold;
}

.visit-row {
	cursor: pointer;
	transition: background-color 0.2s;
}

.visit-row:hover {
	background-color: #f9f9f9;
}

.error {
	color: red;
	padding: 10px;
	background-color: #fee;
	border: 1px solid #fcc;
	border-radius: 4px;
	margin: 10px 0;
}

.no-data {
	text-align: center;
	padding: 20px;
	color: #666;
}
</style>
