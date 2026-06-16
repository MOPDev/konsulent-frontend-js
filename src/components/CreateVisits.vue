<template>
	<div v-if="availableVisits.length > 0">
		<button @click="createVisits" :disabled="isCreateDisabled">Opret besøg</button>
		<!-- visit_type selection drop down menu -->
		<select v-model="selectedVisitType">
			<option v-for="type in visitTypes" :key="type.ID" :value="type.ID">
				{{ type.text }}
			</option>
		</select>
		<p>Valgt: {{ selectedVisitIds.length }} besøg</p>

		<DataTable
			ref="dataTableRef"
			:data="availableVisits"
			:columns="columns"
			selectable
			filterable
			:page-size="100"
			@selection-changed="handleSelectionChange"
			@selection-ids-changed="handleSelectionIdsChange"
		>
			<template #cell-debtors="{ item }">
				<div v-for="(debtor, dIndex) in item.debtors" :key="debtor.navn">
					<input
						type="checkbox"
						:checked="selectedDebtors[getVisitKey(item)]?.includes(dIndex)"
						@change="toggleDebtorSelection(getVisitKey(item), dIndex)"
					/>
					"{{ debtor.navn }}"
				</div>
			</template>

			<template #cell-adresse="{ item }">
				{{ item.adresse }}, {{ item.postnr }} {{ item.bynavn }}
			</template>
			<!-- klientnavn -->
			<template #cell-klientnavn="{ item }">
				{{ item.klientRef }}
			</template>
		</DataTable>
	</div>
	<div v-else-if="error">{{ error }}</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/axios.js'
import DataTable from '@/components/DataTable.vue'

const columns = [
	{ key: 'sagsnr', label: 'Sags nummer', sortable: true, filterable: true },
	{ key: 'klientnavn', label: 'Klient', sortable: true, filterable: true },
	{ key: 'debtors', label: 'Debitorer', sortable: false, filterable: false },
	{ key: 'adresse', label: 'Adresse', sortable: false, filterable: true },
	{ key: 'status', label: 'Advopro Status', sortable: true, filterable: true },
	{ key: 'frist_dato', label: 'Frist dato', sortable: true, filterable: true },
]

const availableVisits = ref([])
const dataTableRef = ref(null)
const selectedVisitsSagsnr = ref([])
const selectedVisitIds = ref([])
const selectedDebtors = ref({})
const error = ref(null)
const selectedVisitType = ref(null)
const visitTypes = ref([])

visitTypes.value = onMounted(fetchVisitTypes)

async function fetchVisitTypes() {
	const { data } = await api.get('/visits/types')
	visitTypes.value = data
}

const isCreateDisabled = computed(() => {
	const hasSagsnr = (selectedVisitsSagsnr.value?.length ?? 0) > 0
	const hasType = !!selectedVisitType.value // or just !!selectedVisitType.value if it’s a primitive
	const result = !(hasSagsnr && hasType)
	return result
})

const getVisitKey = (visit) => {
	// Create a unique key using sagsnr + adresse + postnr + first debtor name
	return `${visit.sagsnr}-${visit.adresse}-${visit.postnr}-${visit.debtors[0]?.navn || ''}`
}

const SCB_NAME = 'Santander Consumer Bank'
const NFD_NAME = 'Nordea Finans Danmark'
const fetchAvailableVisits = async () => {
	try {
		const response = await api.get('/visits/AvailableVisit')

		availableVisits.value = response.data.results.sort((a, b) => {
			return Number(a.sagsnr) - Number(b.sagsnr)
		})

		selectedDebtors.value = {}
		availableVisits.value.forEach((visit) => {
			const visitKey = getVisitKey(visit)
			selectedDebtors.value[visitKey] = visit.debtors.map((_, i) => i)
		})

		// add field called sagvedr which is klientnavn and if klientnavn is SCB then also sagvedr
		availableVisits.value = availableVisits.value.map((visit) => {
			const normalizedKlientnavn = visit.klientnavn.replace(/\r\n/g, ' ').trim()
			const klientRef = normalizedKlientnavn.includes(SCB_NAME)
				? `SCB - ${visit.sagvedr}`
				: normalizedKlientnavn.includes(NFD_NAME)
					? `NFD`
					: normalizedKlientnavn

			return {
				...visit,
				klientRef,
				klientnavn: klientRef, // FIX: set klientnavn to match klientRef for filtering
			}
		})
		error.value = null
	} catch (err) {
		console.error(err)
		error.value = 'Failed to fetch available visits'
		availableVisits.value = []
	}
}

const handleSelectionChange = (selectedSagsnrs) => {
	selectedVisitsSagsnr.value = selectedSagsnrs
}
const handleSelectionIdsChange = (selectedIds) => {
	selectedVisitIds.value = selectedIds
}

const createVisits = async () => {
	try {
		const Data = selectedVisitIds.value
			.map((id) => {
				const visit = availableVisits.value.find(
					(v) => String(v.sagsnr) + String(v.index) === id,
				)
				if (!visit) return null
				const visitKey = getVisitKey(visit)
				return {
					...visit,
					debtors: selectedDebtors.value[visitKey]
						? selectedDebtors.value[visitKey].map((idx) => visit.debtors[idx])
						: [],
				}
			})
			.filter((v) => v !== null)

		const visitType = visitTypes.value.find((type) => type.ID === selectedVisitType.value)

		const DataWithType = Data.map((line) => ({ ...line, visit_type: visitType }))

		const response = await api.post('/visits/create', DataWithType, {
			responseType: 'blob',
		})

		// Create blob and download
		const blob = new Blob([response.data], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		})
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download =
			'visits' +
			new Date().toISOString().slice(0, 10).replace(/-/g, '') +
			visitType.text +
			'.xlsx'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		window.URL.revokeObjectURL(url)

		if (dataTableRef.value) {
			dataTableRef.value.clearSelection()
		}
	} catch (err) {
		console.error('Failed to create visits:', err)
		// Consider adding user feedback here
	}
}

function toggleDebtorSelection(visitKey, dIndex) {
	const current = selectedDebtors.value[visitKey] || []
	if (current.includes(dIndex)) {
		selectedDebtors.value[visitKey] = current.filter((idx) => idx !== dIndex)
	} else {
		selectedDebtors.value[visitKey] = [...current, dIndex]
	}
}

onMounted(() => {
	fetchAvailableVisits()
})
</script>
<style scoped>
table {
	border-collapse: collapse;
	width: 100%;
}

th,
td {
	border: 1px solid #ddd;
	padding: 8px;
	text-align: left;
}

th {
	background-color: #f0f0f0;
}
</style>
