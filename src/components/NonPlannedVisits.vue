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

<script setup lang="ts">
import { visitsApi } from '@/api/visits'
import { usersApi } from '@/api/users'
import { errorApi } from '@/utils/axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/DataTable.vue'
import type { UserWithoutVisits } from '@/schemas'

interface Column {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  copyable?: boolean
}

interface VisitData {
  ID: number
  sagsnr: number
  address: string
  advopro_klient?: string
  type: { text: string }
  debitors: Array<{ name: string }>
  [key: string]: unknown
}

const router = useRouter()
const selectedVisits = ref<(number | string)[]>([])
const selectedUser = ref<string>('')
const selectedDate = ref<string>('')
const selectedDebtors = ref<Record<number, number[]>>({})
const users = ref<UserWithoutVisits[]>([])
const isPlanning = ref<boolean>(false)
const authStore = useAuthStore()
const plannedVisits = ref<VisitData[]>([])
const error = ref<string | null>()

const columns: Column[] = [
	{ key: 'sagsnr', label: 'Sags nummer', copyable: true, sortable: true, filterable: true },
	{ key: 'klientnavn', label: 'Klient', sortable: true, filterable: true },
	{ key: 'debitors', label: 'Debitorer', sortable: false, filterable: true },
	{ key: 'address', label: 'Adresse', sortable: false, filterable: true },
	{ key: 'type.text', label: 'Besøgs Type', sortable: true, filterable: true },
]

async function handleDeleteVisits() {
	if (!confirm('Er du sikker på, at du vil slette de valgte besøg?')) {
		return
	}

	if (!authStore.isAuthenticated) {
		error.value = 'Du skal være logget ind'
		router.push('/login')
		return
	}

	try {
		isPlanning.value = true
		error.value = ''

		const ops = selectedVisits.value.map((v) => visitsApi.delete(Number(v)))

		const results = await Promise.allSettled(ops)

		results.forEach((r, i) => {
			if (r.status !== 'fulfilled') {
				console.error('Failed to delete', selectedVisits.value[i], r.reason)
				errorApi.log('Error deleting visit: ' + r.reason.message)
			}
		})

		selectedVisits.value = []
		selectedUser.value = ''
		selectedDate.value = ''
		await fetchCreatedVisits()

		console.log('Planning successful')
	} catch (err: any) {
		console.error('Planning failed:', err)
		errorApi.log('Error deleting visits: ' + err.message)
	} finally {
		isPlanning.value = false
	}
}

const fetchCreatedVisits = async () => {
	try {
		const result = await visitsApi.getCreated()
		plannedVisits.value = result

		selectedDebtors.value = {}
		result.forEach((visit: any) => {
			selectedDebtors.value[visit.ID] = visit.debitors.map((_: any, i: number) => i)
		})

		plannedVisits.value = result.map((visit: any) => ({
			...visit,
			'type.text': visit.type.text,
			klientnavn: String(visit.advopro_klient ?? ''),
		}))

		error.value = null
	} catch (err: any) {
		console.error(err)
		error.value = 'Failed to fetch available visits'
		plannedVisits.value = []
		errorApi.logError(err)
	}
}

const handlePlanVisits = async () => {
	if (!authStore.isAuthenticated) {
		error.value = 'Du skal være logget ind'
		router.push('/login')
		return
	}

	try {
		isPlanning.value = true
		error.value = ''

		const planData = {
			visitIds: selectedVisits.value.map((v) => Number(v)),
			userId: selectedUser.value,
			date: selectedDate.value,
		}
		console.log(planData)
		const blob = (await visitsApi.generateVisitFile(planData)) as Blob
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = 'visits' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.xlsx'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		window.URL.revokeObjectURL(url)

		selectedVisits.value = []
		selectedUser.value = ''
		selectedDate.value = ''
		await fetchCreatedVisits()

		console.log('Planning successful')
	} catch (err: any) {
		errorApi.log('Error planning visits: ' + err.message)
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

const fetchUsers = async () => {
	try {
		users.value = await usersApi.getAll()
	} catch (err: any) {
		errorApi.logError(err)
		console.error('Failed to fetch users:', err)
	}
}

const handleSelectionChange = (selectedIds: (number | string)[]) => {
	selectedVisits.value = selectedIds
}

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
