<template>
	<div class="np-layout">
		<div class="np-content">
			<h3>Disse besøg er ikke planlagt</h3>
			<p>De mangler at få en dato for besøg og hvem der skal til at besøge dem</p>

			<form
				@submit.prevent="handleCreateGroup(selectedVisits.map(Number))"
				class="planning-form"
				style="margin-bottom: 10px; margin-top: 10px"
			>
				<div class="form-row">
					<button type="submit" :disabled="!selectedVisits.length || isPlanning">
						Opret Gruppe
					</button>
				</div>
			</form>
			<button
				@click="handleDeleteVisits"
				:disabled="!selectedVisits.length || isPlanning"
				style="margin-bottom: 10px"
			>
				Slet Valgte Besøg
			</button>

			<div v-if="error" class="error">{{ error }}</div>

			<DataTable
				:data="ungroupedVisits"
				:columns="columns"
				selectable
				filterable
				paginated
				:page-size="100"
				v-model="selectedVisits"
			>
				<template #cell-debitors="{ item }">
					<div v-for="debtors in item.debitors" :key="debtors.name">
						"{{ debtors?.name }}"
					</div>
				</template>
				<template #cell-adresse="{ item }">
					{{ item.adresse }}, {{ item.postnr }} {{ item.bynavn }}
				</template>
				<template #cell-klientnavn="{ item }">
					{{ item.advopro_klient }}
				</template>
			</DataTable>
		</div>
		<div class="np-map">
			<GroupMap
				ref="groupMapRef"
				:visits="ungroupedVisits as any"
				v-model="selectedVisitsNum"
				@create-group="handleCreateGroup"
				@add-to-group="handleAddToGroup"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { visitsApi } from '@/api/visits'
import { usersApi } from '@/api/users'
import { errorApi } from '@/utils/axios'
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/DataTable.vue'
import GroupMap from '@/components/GroupMap.vue'
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
	latitude?: string | number
	longitude?: string | number
	group_id?: number | null
	stop_nr?: number | null
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

const fetchUsers = async () => {
	try {
		users.value = await usersApi.getAll()
	} catch (err: any) {
		errorApi.logError(err)
		console.error('Failed to fetch users:', err)
	}
}

const ungroupedVisits = computed(() =>
	plannedVisits.value.filter((v) => !v.group_id || v.group_id === 0),
)

const selectedVisitsNum = computed({
	get: () => selectedVisits.value.map(Number),
	set: (ids: number[]) => {
		selectedVisits.value = ids
	},
})

const groupMapRef = ref<InstanceType<typeof GroupMap> | null>(null)

watch(selectedVisits, (ids) => {
	groupMapRef.value?.setSelectedIds(ids.map(Number))
})

async function handleCreateGroup(visitIds: number[]) {
	if (!visitIds.length || isPlanning.value) return

	try {
		isPlanning.value = true
		error.value = null

		await visitsApi.assignVisitsToGroup(visitIds)

		selectedVisits.value = []
		await fetchCreatedVisits()
	} catch (err: any) {
		error.value = err.response?.data?.message || 'Fejl ved oprettelse af gruppe'
		errorApi.log('Error creating group: ' + err.message)
	} finally {
		isPlanning.value = false
	}
}

async function handleAddToGroup(groupId: number, visitIds: number[]) {
	try {
		const ops = visitIds.map((id) => visitsApi.moveVisitToGroup(id, groupId))
		await Promise.allSettled(ops)
		await fetchCreatedVisits()
	} catch (err: any) {
		error.value = err.response?.data?.message || 'Fejl ved tilføjelse til gruppe'
		errorApi.log('Error adding to group: ' + err.message)
	}
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

.np-layout {
	display: flex;
	gap: 20px;
	align-items: flex-start;
}
.np-content {
	flex: 1;
	min-width: 0;
}
.np-map {
	width: 800px;
	height: 600px;
	flex-shrink: 0;
}
@media (max-width: 900px) {
	.np-layout {
		flex-direction: column;
	}
	.np-map {
		width: 100%;
		height: 500px;
	}
}
</style>
