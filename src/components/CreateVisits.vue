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
						:checked="selectedDebtors[getVisitKey(item)]?.includes(Number(dIndex))"
						@change="toggleDebtorSelection(getVisitKey(item), Number(dIndex))"
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

	<GeocodeModal
		:show="showGeocodeModal"
		:visits="pendingGeocodeVisits"
		:visit-type="selectedVisitTypeObject"
		@confirm="handleGeocodeConfirm"
		@close="handleGeocodeClose"
	/>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/axios'
import { errorApi } from '@/utils/axios'
import DataTable from '@/components/DataTable.vue'
import GeocodeModal from '@/components/GeocodeModal.vue'
import type { GeocodedVisit } from '@/components/GeocodeModal.vue'

interface AvailableVisit {
	sagsnr: number | string
	klientnavn: string
	sagvedr: string
	adresse: string
	postnr: string
	bynavn: string
	status: string
	frist_dato: string
	debtors: { navn: string; debitorId: number }[]
	index?: number
	klientRef: string
	klientnr?: number
}

interface VisitType {
	ID: number
	text: string
}

const columns = [
	{ key: 'sagsnr', label: 'Sags nummer', sortable: true, filterable: true },
	{ key: 'klientnavn', label: 'Klient', sortable: true, filterable: true },
	{ key: 'debtors', label: 'Debitorer', sortable: false, filterable: false },
	{ key: 'adresse', label: 'Adresse', sortable: false, filterable: true },
	{ key: 'status', label: 'Advopro Status', sortable: true, filterable: true },
	{ key: 'frist_dato', label: 'Frist dato', sortable: true, filterable: true },
]

const availableVisits = ref<AvailableVisit[]>([])
const dataTableRef = ref<InstanceType<typeof DataTable> | null>(null)
const selectedVisitsSagsnr = ref<(number | string)[]>([])
const selectedVisitIds = ref<(number | string)[]>([])
const selectedDebtors = ref<Record<string, number[]>>({})
const error = ref<string | null>(null)
const selectedVisitType = ref<number | null>(null)
const visitTypes = ref<VisitType[]>([])
const showGeocodeModal = ref(false)
const pendingGeocodeVisits = ref<AvailableVisit[]>([])

const selectedVisitTypeObject = computed(() => {
	if (!selectedVisitType.value) return null
	return visitTypes.value.find((type) => type.ID === selectedVisitType.value) ?? null
})

onMounted(fetchVisitTypes)

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

const getVisitKey = (visit: any): string => {
	// Create a unique key using sagsnr + adresse + postnr + first debtor name
	return `${visit.sagsnr}-${visit.adresse}-${visit.postnr}-${visit.debtors[0]?.navn || ''}`
}

const SCB_NAME = 'Santander Consumer Bank'
const NFD_NAME = 'Nordea Finans Danmark'
const fetchAvailableVisits = async () => {
	try {
		const response = await api.get('/visits/AvailableVisit')

		availableVisits.value = response.data.results.sort((a: any, b: any) => {
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
	} catch (err: any) {
		console.error(err)
		errorApi.log('Error fetching available visits: ' + err.message)
		error.value = 'Failed to fetch available visits'
		availableVisits.value = []
		errorApi.logError(err)
	}
}

const handleSelectionChange = (selectedSagsnrs: (number | string)[]) => {
	selectedVisitsSagsnr.value = selectedSagsnrs
}
const handleSelectionIdsChange = (selectedIds: (number | string)[]) => {
	selectedVisitIds.value = selectedIds
}

const createVisits = async () => {
	pendingGeocodeVisits.value = selectedVisitIds.value
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

	if (pendingGeocodeVisits.value.length === 0) return
	showGeocodeModal.value = true
}

async function sendToBackend(geocodedVisits: GeocodedVisit[]) {
	try {
		const response = await api.post('/visits/create', geocodedVisits, {
			responseType: 'blob',
		})

		const blob = new Blob([response.data], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		})
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download =
			'visits' +
			new Date().toISOString().slice(0, 10).replace(/-/g, '') +
			(selectedVisitTypeObject.value?.text ?? '') +
			'.xlsx'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		window.URL.revokeObjectURL(url)

		if (dataTableRef.value) {
			dataTableRef.value.clearSelection()
		}
		showGeocodeModal.value = false
	} catch (err: any) {
		errorApi.log('Error creating visits: ' + err.message)
		console.error('Failed to create visits:', err)
		errorApi.logError(err)
	}
}

function handleGeocodeConfirm(data: GeocodedVisit[]) {
	showGeocodeModal.value = false
	sendToBackend(data)
}

function handleGeocodeClose() {
	showGeocodeModal.value = false
}

function toggleDebtorSelection(visitKey: string, dIndex: number) {
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
