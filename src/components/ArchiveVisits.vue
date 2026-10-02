<template>
	<div style="margin: 2rem">
		<h3>Arkiv</h3>
		<p class="subtitle">Afsluttede besøg</p>

		<div v-if="error" class="error">{{ error }}</div>

		<div class="filters">
			<input
				v-model="filterSagsnr"
				type="text"
				placeholder="Sagsnr..."
				class="filter-input"
			/>
			<select v-model="filterKonsulentId" class="filter-input">
				<option value="">Alle konsulenter</option>
				<option v-for="user in konsulenter" :key="user.ID" :value="user.ID">
					{{ user.name }}
				</option>
			</select>
			<input v-model="filterMonth" type="month" class="filter-input" title="Måned" />
			<input v-model="filterFrom" type="date" class="filter-input" title="Fra dato" />
			<input v-model="filterTo" type="date" class="filter-input" title="Til dato" />
			<button @click="clearFilters">Ryd filtre</button>
		</div>

		<VisitMap style="height: 500px; width: 100%" :visits="filteredVisits" />

		<div class="actions">
			<button @click="requestPdfs" :disabled="!selectedVisitIds.length">
				Hent PDF for valgte besøg ({{ selectedVisitIds.length }})
			</button>
			<span class="count">{{ filteredVisits.length }} besøg</span>
		</div>

		<DataTable
			:data="filteredVisits"
			:columns="columns"
			selectable
			paginated
			:page-size="100"
			v-model="selectedVisitIds"
			@selection-ids-changed="handleSelectionChange"
		>
			<template #cell-konsulentName="{ item }">
				{{ item.konsulentName }}
			</template>
			<template #cell-debitors="{ item }">
				<div v-for="debitor in item.debitors" :key="debitor.ID">
					{{ debitor.name }}
				</div>
			</template>
			<template #cell-address="{ item }">
				{{ formatAddress(item.address) }}
			</template>
			<template #cell-visit_date="{ item }">
				{{ formatDate(item.visit_date) }}
			</template>
			<template #cell-status="{ item }">
				<span v-if="item.status">{{ item.status.ID }}: {{ item.status.text }}</span>
			</template>
			<template #cell-group_id="{ item }">
				<span v-if="item.group_id" class="group-badge">{{ item.group_id }}</span>
			</template>
		</DataTable>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { visitsApi } from '@/api/visits'
import type { VisitWithDebitors } from '@/api/visits'
import { usersApi } from '@/api/users'
import { USER_RIGHTS } from '@/stores/auth'
import type { UserWithoutVisits } from '@/schemas'
import { errorApi } from '@/utils/axios'
import DataTable from './DataTable.vue'
import VisitMap from './VisitMap.vue'

interface Column {
	key: string
	label: string
	sortable?: boolean
	filterable?: boolean
	copyable?: boolean
}

type ArchiveVisit = VisitWithDebitors & { konsulentName: string }

const columns: Column[] = [
	{ key: 'ID', label: 'ID', sortable: true, filterable: true },
	{ key: 'konsulentName', label: 'Konsulent', sortable: true, filterable: true },
	{ key: 'sagsnr', label: 'Sagsnr', copyable: true, sortable: true, filterable: true },
	{ key: 'debitors', label: 'Debitorer', sortable: false, filterable: false },
	{ key: 'address', label: 'Adresse', sortable: false, filterable: true },
	{ key: 'visit_date', label: 'Dato', sortable: true, filterable: true },
	{
		key: 'visit_response.actual_time',
		label: 'Tidspunkt',
		sortable: false,
		filterable: false,
	},
	{ key: 'type.text', label: 'Type', sortable: true, filterable: true },
]

const visits = ref<ArchiveVisit[]>([])
const konsulenter = ref<UserWithoutVisits[]>([])
const selectedVisitIds = ref<number[]>([])
const error = ref<string | null>(null)

const filterSagsnr = ref('')
const filterKonsulentId = ref<number | ''>('')
const filterMonth = ref('')
const filterFrom = ref('')
const filterTo = ref('')

const filteredVisits = computed(() => {
	const sagsnr = filterSagsnr.value.trim().toLowerCase()
	return visits.value.filter((visit) => {
		if (sagsnr && !String(visit.sagsnr).toLowerCase().includes(sagsnr)) return false
		if (filterKonsulentId.value && visit.user_id !== Number(filterKonsulentId.value))
			return false

		const date = (visit.visit_date || '').slice(0, 10)
		if (filterMonth.value && !date.startsWith(filterMonth.value)) return false
		if (filterFrom.value && date < filterFrom.value) return false
		if (filterTo.value && date > filterTo.value) return false
		return true
	})
})

watch([filterSagsnr, filterKonsulentId, filterMonth, filterFrom, filterTo], () => {
	selectedVisitIds.value = []
})

function clearFilters() {
	filterSagsnr.value = ''
	filterKonsulentId.value = ''
	filterMonth.value = ''
	filterFrom.value = ''
	filterTo.value = ''
}

onMounted(async () => {
	await Promise.all([fetchVisits(), fetchKonsulenter()])
})

async function fetchVisits() {
	try {
		const result = await visitsApi.getByStatus(5)
		visits.value = (result || []).map((visit) => ({
			...visit,
			konsulentName: (visit as any).konsulentName || visit.user?.name || 'Ukendt konsulent',
		}))
		error.value = null
	} catch (err: any) {
		console.error('Error fetching archived visits:', err)
		error.value = 'Fejl ved hentning af arkiv: ' + err.message
		errorApi.logError(err)
	}
}

async function fetchKonsulenter() {
	try {
		const all = await usersApi.getAll()
		konsulenter.value = all.filter((user) => user.rights === USER_RIGHTS.AUDITOR)
	} catch (err: any) {
		console.error('Error fetching users:', err)
		errorApi.logError(err)
	}
}

function formatAddress(address: string): string {
	if (!address) return ''
	return address.replace(/\r?\n/g, ', ')
}

function formatDate(date: string | null | undefined): string {
	if (!date) return ''
	const d = new Date(date)
	if (isNaN(d.getTime())) return ''
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

const handleSelectionChange = (selectedIds: (number | string)[]) => {
	selectedVisitIds.value = selectedIds.map(Number)
}

function requestPdfs() {
	selectedVisitIds.value.forEach((id) => getPdf(Number(id)))
}

const getPdf = async (id: number) => {
	try {
		const response = await visitsApi.downloadPdf(id)

		const disposition = response.headers['content-disposition']
		let filename = 'visit.pdf'
		if (disposition && disposition.indexOf('filename=') !== -1) {
			filename = disposition.split('filename=')[1].replace(/["']/g, '')
		}

		const url = window.URL.createObjectURL(new Blob([response.data]))
		const link = document.createElement('a')
		link.href = url
		link.setAttribute('download', filename)
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		window.URL.revokeObjectURL(url)
	} catch (err: any) {
		console.error('Error fetching PDF:', err)
		error.value = 'Fejl ved hentning af PDF'
		errorApi.logError(err)
	}
}
</script>

<style scoped>
.subtitle {
	color: #6b7280;
	margin-top: -0.5rem;
	margin-bottom: 1rem;
}

.filters {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
	margin-bottom: 1rem;
}

.filter-input {
	padding: 0.5rem 0.75rem;
	border: 1px solid #d1d5db;
	border-radius: 0.375rem;
	font-size: 0.875rem;
	transition:
		border-color 0.2s,
		box-shadow 0.2s;
}

.filter-input:focus {
	outline: none;
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filters button {
	padding: 0.5rem 1rem;
	border: 1px solid #d1d5db;
	background: white;
	border-radius: 0.375rem;
	cursor: pointer;
	font-size: 0.875rem;
	transition: all 0.2s;
}

.filters button:hover {
	background-color: #f3f4f6;
	border-color: #9ca3af;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.75rem;
	margin: 1rem 0;
}

.actions button {
	padding: 0.5rem 1rem;
	border: 1px solid #d1d5db;
	background: white;
	border-radius: 0.375rem;
	cursor: pointer;
	font-size: 0.875rem;
	transition: all 0.2s;
}

.actions button:hover:not(:disabled) {
	background-color: #f3f4f6;
	border-color: #9ca3af;
}

.actions button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.count {
	color: #6b7280;
	font-size: 0.875rem;
}

.error {
	color: red;
	padding: 0.75rem;
	background-color: #fee;
	border: 1px solid #fcc;
	border-radius: 0.25rem;
	margin-bottom: 1rem;
}

.group-badge {
	display: inline-block;
	padding: 0.125rem 0.5rem;
	background-color: #e0e7ff;
	color: #3730a3;
	border-radius: 0.25rem;
	font-size: 0.75rem;
	font-weight: 500;
}

@media (max-width: 480px) {
	.filters,
	.actions {
		flex-direction: column;
	}
	.filter-input,
	.filters button,
	.actions button {
		width: 100%;
	}
}
</style>
