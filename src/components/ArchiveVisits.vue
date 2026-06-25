<template>
	<div>
		<h3>Arkiv</h3>
		<p class="subtitle">Afsluttede besøg</p>

		<div v-if="error" class="error">{{ error }}</div>

		<div class="actions">
			<button @click="requestPdfs" :disabled="!selectedVisitIds.length">
				Hent PDF for valgte besøg ({{ selectedVisitIds.length }})
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
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/axios'
import DataTable from './DataTable.vue'

const columns = [
	{ key: 'ID', label: 'Besøgs ID', sortable: true, filterable: true },
	{ key: 'konsulentName', label: 'Konsulent', sortable: true, filterable: true },
	{ key: 'sagsnr', label: 'Sags nummer', copyable: true, sortable: true, filterable: true },
	{ key: 'debitors', label: 'Debitorer', sortable: false, filterable: false },
	{ key: 'address', label: 'Adresse', sortable: false, filterable: true },
	{ key: 'visit_date', label: 'Dato', sortable: true, filterable: true },
	{
		key: 'visit_response.actual_time',
		label: 'Besøgs tidspunkt',
		sortable: false,
		filterable: false,
	},
	{ key: 'type.text', label: 'Type', sortable: true, filterable: true },
	{ key: 'status', label: 'Status', sortable: false, filterable: true },
	{ key: 'group_id', label: 'Gruppe', sortable: true, filterable: true },
]

const visits = ref([])
const selectedVisitIds = ref([])
const error = ref(null)
const tableRefs = ref({})
const expandedGroups = ref(new Set())

const setTableRef = (key, el) => {
	if (el) tableRefs.value[key] = el
}

const groupedVisits = computed(() => {
	const groups = {}
	const other = []

	visits.value.forEach((visit) => {
		if (visit.group_id && visit.group_id !== 0) {
			const key = String(visit.group_id)
			if (!groups[key]) groups[key] = { key, visits: [] }
			groups[key].visits.push(visit)
		} else {
			other.push(visit)
		}
	})

	Object.values(groups).forEach((group) => {
		group.visits.sort((a, b) => (a.stop_nr ?? 0) - (b.stop_nr ?? 0))
		group.date = group.visits[0]?.visit_date
	})

	const sortedGroups = Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date))

	if (other.length > 0) {
		other.sort((a, b) => {
			const dateA = new Date(a.visit_date)
			const dateB = new Date(b.visit_date)
			if (dateA - dateB !== 0) return dateA - dateB
			return (a.visit_time || '').localeCompare(b.visit_time || '')
		})
		sortedGroups.push({ key: 'other', visits: other, date: null })
	}

	return sortedGroups
})

onMounted(fetchVisits)

async function fetchVisits() {
	try {
		const response = await api.get('/visits/byStatus', { params: { status: 5 } })
		visits.value = (response.data.visit || []).map((visit) => ({
			...visit,
			konsulentName: visit.konsulentName || visit.user?.name || 'Ukendt konsulent',
		}))
		error.value = null
	} catch (err) {
		console.error('Error fetching archived visits:', err)
		error.value = 'Fejl ved hentning af arkiv: ' + err.message
	}
}

function formatAddress(address) {
	if (!address) return ''
	return address.replace(/\r?\n/g, ', ')
}

function formatDate(date) {
	if (!date) return ''
	const d = new Date(date)
	if (isNaN(d)) return ''
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

const handleSelectionChange = (selectedIds) => {
	selectedVisitIds.value = selectedIds
}

function toggleGroup(key) {
	if (expandedGroups.value.has(key)) {
		expandedGroups.value.delete(key)
	} else {
		expandedGroups.value.add(key)
	}
	expandedGroups.value = new Set(expandedGroups.value)
}

function requestPdfs() {
	selectedVisitIds.value.forEach((id) => getPdf(id))
}

const getPdf = async (id) => {
	try {
		const response = await api.get('/visit/pdf', {
			params: { id },
			responseType: 'blob',
		})

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
	} catch (err) {
		console.error('Error fetching PDF:', err)
		error.value = 'Fejl ved hentning af PDF'
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
	.group-header {
		flex-direction: column;
		align-items: flex-start;
	}
	.actions {
		flex-direction: column;
	}
	.actions button {
		width: 100%;
	}
}
</style>
