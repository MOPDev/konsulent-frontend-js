<template>
	<div>
		<h3>Ikke besøgt</h3>
		<p class="subtitle">Besøg klar til at blive besøgt</p>

		<div v-if="error" class="error">{{ error }}</div>

		<div class="actions">
			<button @click="handleDeleteVisits" :disabled="!selectedVisitIds.length">
				Slet valgte besøg ({{ selectedVisitIds.length }})
			</button>
		</div>

		<div v-for="group in groupedVisits" :key="group.key" class="group-section">
			<div class="group-header" @click="toggleGroup(group.key)">
				<div class="group-title">
					<span>{{ expandedGroups.has(group.key) ? '▼' : '▶' }}</span>
					<h4 v-if="group.key !== 'other'">
						{{ group.visits[0].konsulentName }} - {{ group.visits.length }} -
						{{ formatDate(group.date) }}
					</h4>
					<h4 v-else>Andre besøg</h4>
				</div>

				<div v-if="group.key !== 'other'" class="group-actions" @click.stop>
					<button @click="downloadGroupExcel(Number(group.key))" class="small-btn">
						Download Excel
					</button>
				</div>
			</div>

			<div v-if="expandedGroups.has(group.key)">
				<DataTable
					:ref="(el) => setTableRef(group.key, el)"
					:data="group.visits"
					:columns="columns"
					selectable
					filterable
					paginated
					:page-size="100"
					v-model="selectedVisitIds"
					@selection-ids-changed="handleSelectionChange"
					:row-class="(item: any) => (item.cancelled ? 'cancelled-row' : undefined)"
					:disable-selection-check="(item: any) => !!item.cancelled"
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
					<template #cell-actions="{ item }">
						<button
							v-if="!item.cancelled"
							@click="handleCancel(item)"
							class="cancel-btn"
							title="Afmeld besøg"
						>
							Afmeld
						</button>
						<button
							v-else
							@click="handleUncancel(item)"
							class="uncancel-btn"
							title="Fortryd afmelding"
						>
							Fortryd
						</button>
					</template>
				</DataTable>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { visitsApi } from '@/api/visits'
import { errorApi } from '@/utils/axios'
import { ref, computed, onMounted } from 'vue'
import DataTable from './DataTable.vue'

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
	visit_date: string
	visit_time?: string
	stop_nr?: number
	group_id?: number | null
	status?: { ID: number; text: string }
	status_id?: number
	konsulentName?: string
	user?: { name: string }
	debitors: Array<{ ID: number; name: string }>
	type: { text: string }
	cancelled?: boolean | null
	[key: string]: unknown
}

interface VisitGroup {
	key: string
	visits: VisitData[]
	date: string | null
}

const columns: Column[] = [
	{ key: 'ID', label: 'Besøgs ID', sortable: true, filterable: true },
	{ key: 'konsulentName', label: 'Konsulent', sortable: true, filterable: true },
	{ key: 'sagsnr', label: 'Sags nummer', copyable: true, sortable: true, filterable: true },
	{ key: 'debitors', label: 'Debitorer', sortable: false, filterable: false },
	{ key: 'address', label: 'Adresse', sortable: false, filterable: true },
	{ key: 'visit_date', label: 'Dato', sortable: true, filterable: true },
	{ key: 'visit_time', label: 'Tidspunkt', sortable: true, filterable: false },
	{ key: 'type.text', label: 'Type', sortable: true, filterable: true },
	{ key: 'status', label: 'Status', sortable: true, filterable: true },
	{ key: 'group_id', label: 'Gruppe', sortable: true, filterable: true },
	{ key: 'actions', label: '', sortable: false, filterable: false },
]

const visits = ref<VisitData[]>([])
const selectedVisitIds = ref<(number | string)[]>([])
const error = ref<string | null>(null)
const tableRefs = ref<Record<string, any>>({})
const expandedGroups = ref<Set<string>>(new Set())

const setTableRef = (key: string, el: any) => {
	if (el) tableRefs.value[key] = el
}

const groupedVisits = computed<VisitGroup[]>(() => {
	const groups: Record<string, VisitGroup> = {}
	const other: VisitData[] = []

	visits.value.forEach((visit) => {
		if (visit.group_id && visit.group_id !== 0) {
			const key = String(visit.group_id)
			if (!groups[key]) {
				groups[key] = { key, visits: [], date: null }
			}
			groups[key].visits.push(visit)
		} else {
			other.push(visit)
		}
	})

	Object.values(groups).forEach((group) => {
		group.visits.sort((a, b) => (a.stop_nr ?? 0) - (b.stop_nr ?? 0))
		group.date = group.visits[0]?.visit_date ?? null
	})

	const sortedGroups = Object.values(groups).sort((a, b) => {
		return new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime()
	})

	if (other.length > 0) {
		other.sort((a, b) => {
			const dateA = new Date(a.visit_date).getTime()
			const dateB = new Date(b.visit_date).getTime()
			if (dateB - dateA !== 0) return dateB - dateA
			return (b.visit_time || '').localeCompare(a.visit_time || '')
		})
		sortedGroups.push({ key: 'other', visits: other, date: null })
	}

	return sortedGroups
})

onMounted(getNotVisitedVisits)

async function getNotVisitedVisits() {
	try {
		const result = await visitsApi.getByStatus(3)
		visits.value = (result || []).map((visit: any) => ({
			...visit,
			konsulentName: visit.konsulentName || visit.user?.name || 'Ukendt konsulent',
		}))
		error.value = null
	} catch (err: any) {
		error.value = 'Fejl ved hentning af besøg: ' + err.message
		console.error('Error fetching not visited visits:', err)
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
	selectedVisitIds.value = selectedIds
}

function toggleGroup(key: string) {
	if (expandedGroups.value.has(key)) {
		expandedGroups.value.delete(key)
	} else {
		expandedGroups.value.add(key)
	}
	expandedGroups.value = new Set(expandedGroups.value)
}

async function downloadGroupExcel(groupId: number) {
	try {
		const response = await visitsApi.downloadGroupExcel(groupId)
		const url = window.URL.createObjectURL(new Blob([response.data]))
		const link = document.createElement('a')
		link.href = url
		link.setAttribute('download', `Gruppe_${groupId}_besøg.xlsx`)
		document.body.appendChild(link)
		link.click()
		link.remove()
		window.URL.revokeObjectURL(url)
	} catch (err: any) {
		console.error('Error downloading Excel:', err)
		error.value = 'Fejl ved download af Excel'
		errorApi.logError(err)
	}
}

async function handleCancel(visit: any) {
	if (!confirm('Er du sikker på, at du vil afmelde dette besøg?')) {
		return
	}
	error.value = null
	try {
		await visitsApi.cancelVisit(visit.ID)
		visit.cancelled = true
	} catch (err: any) {
		console.error('Error cancelling visit:', err)
		error.value = 'Fejl ved afmelding af besøg'
		errorApi.logError(err)
	}
}

async function handleUncancel(visit: any) {
	if (!confirm('Er du sikker på, at du vil fortryde afmeldingen af dette besøg?')) {
		return
	}
	error.value = null
	try {
		await visitsApi.uncancelVisit(visit.ID)
		visit.cancelled = false
	} catch (err: any) {
		console.error('Error uncancelling visit:', err)
		error.value = 'Fejl ved fortryd af afmelding'
		errorApi.logError(err)
	}
}

async function handleDeleteVisits() {
	if (!selectedVisitIds.value.length) return

	if (!confirm('Er du sikker på, at du vil slette de valgte besøg?')) {
		return
	}

	error.value = null
	try {
		const ops = selectedVisitIds.value.map((id) => visitsApi.delete(Number(id)))
		const results = await Promise.allSettled(ops)

		results.forEach((r: PromiseSettledResult<any>, i: number) => {
			if (r.status !== 'fulfilled') {
				console.error(`Failed to delete ${selectedVisitIds.value[i]}:`, r.reason)
			}
		})

		selectedVisitIds.value = []
		Object.values(tableRefs.value).forEach((table: any) => table?.clearSelection())
		await getNotVisitedVisits()
	} catch (err: any) {
		console.error('Error deleting visits:', err)
		error.value = 'Fejl ved sletning af besøg'
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

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
	margin-bottom: 1rem;
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

.error {
	color: red;
	padding: 0.75rem;
	background-color: #fee;
	border: 1px solid #fcc;
	border-radius: 0.25rem;
	margin-bottom: 1rem;
}

.group-section {
	margin-bottom: 2rem;
}

.group-header {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: center;
	gap: 0.75rem;
	margin: 1rem 0 0.5rem 0;
	cursor: pointer;
	user-select: none;
}
.group-header:hover {
	background-color: #f9fafb;
}
.group-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.group-section h4 {
	margin: 0;
	color: #374151;
	font-size: 1rem;
}

.group-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.small-btn {
	padding: 0.25rem 0.5rem;
	font-size: 0.75rem;
	border: 1px solid #d1d5db;
	background: white;
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.2s;
}

.small-btn:hover {
	background-color: #f3f4f6;
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

.cancel-btn {
	padding: 0.25rem 0.5rem;
	font-size: 0.75rem;
	border: 1px solid #ef4444;
	background: white;
	color: #ef4444;
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.2s;
}

.cancel-btn:hover {
	background-color: #fef2f2;
}

.uncancel-btn {
	padding: 0.25rem 0.5rem;
	font-size: 0.75rem;
	border: 1px solid #6b7280;
	background: white;
	color: #6b7280;
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.2s;
}

.uncancel-btn:hover {
	background-color: #f3f4f6;
}

:deep(.cancelled-row) {
	text-decoration: line-through;
	color: #9ca3af;
	background-color: #fef2f2 !important;
}

:deep(.cancelled-row) td {
	color: #9ca3af;
}

:deep(.cancelled-row:hover) {
	background-color: #fef2f2 !important;
}

@media (max-width: 480px) {
	.group-header {
		flex-direction: column;
		align-items: flex-start;
	}
	.group-actions {
		width: 100%;
	}
	.group-actions button {
		flex: 1;
	}
	.actions {
		flex-direction: column;
	}
	.actions button {
		width: 100%;
	}
}
</style>
