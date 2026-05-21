<template>
	<div>
		<h3>Planlagte besøg</h3>

		<div v-if="error" class="error">{{ error }}</div>

		<div class="actions">
			<button @click="handleSendLetter" :disabled="!selectedVisitIds.length">
				Send brev til valgte besøg ({{ selectedVisitIds.length }})
			</button>
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
					<button @click="downloadGroupExcel(group.key)" class="small-btn">
						Download Excel
					</button>
					<button @click="openDateModal(group)" class="small-btn">Ændre dato</button>
					<button @click="openKonsulentModal(group)" class="small-btn">
						Ændre konsulent
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
					<template #cell-group_id="{ item }">
						<div class="row-actions">
							<span v-if="item.group_id" class="group-badge">{{
								item.group_id
							}}</span>
							<button
								v-if="item.status_id !== 3"
								@click="openRemoveModal(item)"
								class="tiny-btn"
								title="Fjern fra gruppe"
							>
								×
							</button>
							<button
								v-if="!item.group_id && item.status_id !== 3"
								@click="openAddToGroupModal(item)"
								class="tiny-btn add-btn"
								title="Tilføj til gruppe"
							>
								+
							</button>
						</div>
					</template>
				</DataTable>
			</div>
		</div>

		<!-- 1. Date Modal (Bootstrap Style) -->
		<Teleport to="body">
			<div v-if="showDateModal">
				<!-- The backdrop (the darkening effect) -->
				<div class="modal-backdrop fade show"></div>

				<!-- The Modal -->
				<div class="modal fade show" tabindex="-1" style="display: block" role="dialog">
					<div class="modal-dialog" role="document">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title">
									Ændre dato for gruppe {{ selectedGroup?.key }}
								</h5>
								<button
									type="button"
									class="btn-close"
									@click="closeDateModal"
									aria-label="Close"
								></button>
							</div>
							<div class="modal-body">
								<label class="form-label">Vælg ny dato</label>
								<input type="date" class="form-control" v-model="newDate" />
							</div>
							<div class="modal-footer">
								<button
									type="button"
									class="btn btn-secondary"
									@click="closeDateModal"
								>
									Annuller
								</button>
								<button
									type="button"
									class="btn btn-primary"
									@click="submitDateChange"
								>
									Gem ændringer
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- 2. Konsulent Modal (Bootstrap Style) -->
		<Teleport to="body">
			<div v-if="showKonsulentModal">
				<div class="modal-backdrop fade show"></div>
				<div class="modal fade show" tabindex="-1" style="display: block" role="dialog">
					<div class="modal-dialog" role="document">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title">
									Ændre konsulent for gruppe {{ selectedGroup?.key }}
								</h5>
								<button
									type="button"
									class="btn-close"
									@click="closeKonsulentModal"
								></button>
							</div>
							<div class="modal-body">
								<label class="form-label">Konsulent</label>
								<select class="form-select" v-model="newUserId">
									<option value="">Vælg konsulent</option>
									<option v-for="user in users" :key="user.ID" :value="user.ID">
										{{ user.name }}
									</option>
								</select>
							</div>
							<div class="modal-footer">
								<button
									type="button"
									class="btn btn-secondary"
									@click="closeKonsulentModal"
								>
									Annuller
								</button>
								<button
									type="button"
									class="btn btn-primary"
									@click="submitKonsulentChange"
									:disabled="!newUserId"
								>
									Gem
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- Remove from Group Modal (Bootstrap Style) -->
		<Teleport to="body">
			<div v-if="showRemoveModal">
				<div class="modal-backdrop fade show"></div>
				<div class="modal fade show" tabindex="-1" style="display: block" role="dialog">
					<div class="modal-dialog" role="document">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title">Fjern fra gruppe</h5>
								<button
									type="button"
									class="btn-close"
									@click="closeRemoveModal"
								></button>
							</div>
							<div class="modal-body">
								<p>Vil du fjerne besøg {{ selectedVisit?.ID }} fra gruppen?</p>
							</div>
							<div class="modal-footer">
								<button
									type="button"
									class="btn btn-secondary"
									@click="closeRemoveModal"
								>
									Annuller
								</button>
								<button
									type="button"
									class="btn btn-danger"
									@click="submitRemoveFromGroup"
								>
									Fjern
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- Add to Group Modal (Bootstrap Style) -->
		<Teleport to="body">
			<div v-if="showAddToGroupModal">
				<div class="modal-backdrop fade show"></div>
				<div class="modal fade show" tabindex="-1" style="display: block" role="dialog">
					<div class="modal-dialog" role="document">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title">Tilføj til gruppe</h5>
								<button
									type="button"
									class="btn-close"
									@click="closeAddToGroupModal"
								></button>
							</div>
							<div class="modal-body">
								<label class="form-label"
									>Vælg en eksisterende gruppe eller opret en ny:</label
								>
								<select class="form-select" v-model="targetGroupId">
									<option :value="null">Opret ny gruppe</option>
									<option
										v-for="group in existingGroups"
										:key="group.key"
										:value="group.key"
									>
										Gruppe {{ group.key }} ({{ formatDate(group.date) }})
									</option>
								</select>
								<div v-if="targetGroupId === null" class="alert alert-info mt-2">
									Ny gruppe vil blive oprettet med samme dato og konsulent som
									besøget.
								</div>
							</div>
							<div class="modal-footer">
								<button
									type="button"
									class="btn btn-secondary"
									@click="closeAddToGroupModal"
								>
									Annuller
								</button>
								<button
									type="button"
									class="btn btn-primary"
									@click="submitAddToGroup"
								>
									Tilføj
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<script setup>
import api from '@/utils/axios'
import { ref, computed, onMounted } from 'vue'
import DataTable from './DataTable.vue'

const columns = [
	{ key: 'ID', label: 'Besøgs ID', sortable: true, filterable: true },
	{ key: 'konsulentName', label: 'Konsulent', sortable: true, filterable: true },
	{ key: 'debitors', label: 'Debitorer', sortable: false, filterable: false },
	{ key: 'address', label: 'Adresse', sortable: false, filterable: true },
	{ key: 'visit_date', label: 'Dato', sortable: true, filterable: true },
	{ key: 'visit_time', label: 'Tidspunkt', sortable: true, filterable: false },
	{ key: 'visit_interval', label: 'Interval', sortable: false, filterable: false },
	{ key: 'group_id', label: 'Gruppe', sortable: true, filterable: true },
]

const visits = ref([])
const selectedVisitIds = ref([])
const error = ref(null)
const tableRefs = ref({})
const users = ref([])

const showDateModal = ref(false)
const showKonsulentModal = ref(false)
const showRemoveModal = ref(false)
const showAddToGroupModal = ref(false)
const selectedGroup = ref(null)
const selectedVisit = ref(null)
const newDate = ref('')
const newUserId = ref('')
const targetGroupId = ref(null)

const expandedGroups = ref(new Set())

const existingGroups = computed(() => {
	return groupedVisits.value.filter((g) => g.key !== 'other')
})

const setTableRef = (key, el) => {
	if (el) tableRefs.value[key] = el
}

const groupedVisits = computed(() => {
	const groups = {}
	const other = []

	visits.value.forEach((visit) => {
		if (visit.group_id && visit.group_id !== 0) {
			const key = String(visit.group_id)
			if (!groups[key]) {
				groups[key] = { key, visits: [] }
			}
			groups[key].visits.push(visit)
		} else {
			other.push(visit)
		}
	})

	Object.values(groups).forEach((group) => {
		group.visits.sort((a, b) => a.stop_nr - b.stop_nr)
		group.date = group.visits[0]?.visit_date
	})

	const sortedGroups = Object.values(groups).sort((a, b) => {
		return new Date(a.date) - new Date(b.date)
	})

	if (other.length > 0) {
		other.sort((a, b) => a.stop_nr - b.stop_nr)
		sortedGroups.push({ key: 'other', visits: other, date: null })
	}

	return sortedGroups
})

onMounted(async () => {
	await getPlannedVisits()
	await getUsers()
})

async function getPlannedVisits() {
	try {
		const res = await api.get('/visits/planned')
		visits.value = (res.data || []).flatMap((konsulent) =>
			(konsulent.visits || []).map((visit) => ({
				...visit,
				konsulentName: konsulent.name,
			})),
		)
		error.value = null
	} catch (err) {
		console.error('Error fetching planned visits:', err)
		error.value = 'Fejl ved hentning af planlagte besøg'
	}
}

async function getUsers() {
	try {
		const res = await api.get('/users')
		users.value = res.data.users || []
	} catch (err) {
		console.error('Error fetching users:', err)
	}
}

function formatAddress(address) {
	if (!address) return ''
	return address.replace(/\r?\n/g, ', ')
}

function formatDate(date) {
	if (!date) return ''
	const d = new Date(date)
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

const handleSelectionChange = (selectedIds) => {
	selectedVisitIds.value = selectedIds
}

async function downloadGroupExcel(groupId) {
	try {
		const response = await api.get(`/visits/group/${groupId}/planned`, {
			responseType: 'blob',
		})
		const url = window.URL.createObjectURL(new Blob([response.data]))
		const link = document.createElement('a')
		link.href = url
		link.setAttribute('download', `Gruppe_${groupId}_planlagte_besøg.xlsx`)
		document.body.appendChild(link)
		link.click()
		link.remove()
		window.URL.revokeObjectURL(url)
	} catch (err) {
		console.error('Error downloading Excel:', err)
		error.value = 'Fejl ved download af Excel'
	}
}

function openDateModal(group) {
	selectedGroup.value = group
	if (group.date) {
		const d = new Date(group.date)
		newDate.value = d.toISOString().split('T')[0]
	}
	showDateModal.value = true
}

function closeDateModal() {
	showDateModal.value = false
	newDate.value = ''
}

async function submitDateChange() {
	if (!newDate.value || !selectedGroup.value) return

	try {
		await api.patch(`/visits/group/${selectedGroup.value.key}/date`, {
			newDate: newDate.value,
		})
		closeDateModal()
		await getPlannedVisits()
	} catch (err) {
		error.value = err.response?.data?.error || 'Fejl ved ændring af dato'
	}
}

function openKonsulentModal(group) {
	selectedGroup.value = group
	const firstVisit = group.visits[0]
	newUserId.value = firstVisit?.user_id || ''
	showKonsulentModal.value = true
}

function closeKonsulentModal() {
	showKonsulentModal.value = false
	newUserId.value = ''
}

async function submitKonsulentChange() {
	if (!newUserId.value || !selectedGroup.value) return

	try {
		await api.patch(`/visits/group/${selectedGroup.value.key}/konsulent`, {
			newUserId: parseInt(newUserId.value),
		})
		closeKonsulentModal()
		await getPlannedVisits()
	} catch (err) {
		error.value = err.response?.data?.error || 'Fejl ved ændring af konsulent'
	}
}

function openRemoveModal(visit) {
	selectedVisit.value = visit
	showRemoveModal.value = true
}

function closeRemoveModal() {
	showRemoveModal.value = false
	selectedVisit.value = null
}

async function submitRemoveFromGroup() {
	if (!selectedVisit.value) return

	try {
		await api.patch(`/visits/${selectedVisit.value.ID}/group`, {
			targetGroupId: null,
		})
		closeRemoveModal()
		await getPlannedVisits()
	} catch (err) {
		error.value = err.response?.data?.error || 'Fejl ved fjernelse fra gruppe'
	}
}

function openAddToGroupModal(visit) {
	selectedVisit.value = visit
	targetGroupId.value = null
	showAddToGroupModal.value = true
}

function closeAddToGroupModal() {
	showAddToGroupModal.value = false
	targetGroupId.value = null
	selectedVisit.value = null
}

async function submitAddToGroup() {
	if (!selectedVisit.value) return

	try {
		await api.patch(`/visits/${selectedVisit.value.ID}/group`, {
			targetGroupId: Number(targetGroupId.value),
		})
		closeAddToGroupModal()
		await getPlannedVisits()
	} catch (err) {
		error.value = err.response?.data?.error || 'Fejl ved tilføjelse til gruppe'
	}
}

async function handleSendLetter() {
	if (!selectedVisitIds.value.length) return

	error.value = null
	try {
		const ops = selectedVisitIds.value.map((id) =>
			api.post('/visit/letterSent', null, { params: { id } }),
		)
		const results = await Promise.allSettled(ops)

		let hasErrors = false
		results.forEach((r, i) => {
			if (r.status !== 'fulfilled') {
				console.error(`Failed to send letter for ${selectedVisitIds.value[i]}:`, r.reason)
				hasErrors = true
			}
		})

		if (hasErrors) {
			error.value = 'Nogle breve blev ikke sendt. Prøv igen.'
		}

		selectedVisitIds.value = []
		Object.values(tableRefs.value).forEach((table) => table?.clearSelection())
		await getPlannedVisits()
	} catch (err) {
		console.error('Error sending letters:', err)
		error.value = 'Fejl ved afsendelse af breve'
	}
}

async function handleDeleteVisits() {
	if (!selectedVisitIds.value.length) return

	error.value = null
	try {
		const ops = selectedVisitIds.value.map((id) =>
			api.delete('/visit/byId', { params: { id } }),
		)
		const results = await Promise.allSettled(ops)

		results.forEach((r, i) => {
			if (r.status !== 'fulfilled') {
				console.error(`Failed to delete ${selectedVisitIds.value[i]}:`, r.reason)
			}
		})

		selectedVisitIds.value = []
		Object.values(tableRefs.value).forEach((table) => table?.clearSelection())
		await getPlannedVisits()
	} catch (err) {
		console.error('Error deleting visits:', err)
		error.value = 'Fejl ved sletning af besøg'
	}
}

function toggleGroup(key) {
	if (expandedGroups.value.has(key)) {
		expandedGroups.value.delete(key)
	} else {
		expandedGroups.value.add(key)
	}
	// Force reactivity since Set mutations aren't tracked
	expandedGroups.value = new Set(expandedGroups.value)
}
</script>

<style scoped>
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

.toggle-arrow {
	font-size: 0.75rem;
	color: #6b7280;
	width: 1rem;
	display: inline-block;
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
	margin-right: 0.25rem;
}

.row-actions {
	display: flex;
	align-items: center;
}

.tiny-btn {
	padding: 0.125rem 0.25rem;
	font-size: 0.75rem;
	line-height: 1;
	border: 1px solid #ef4444;
	background: white;
	color: #ef4444;
	border-radius: 0.25rem;
	cursor: pointer;
	margin-left: 0.25rem;
}

.tiny-btn.add-btn {
	border-color: #10b981;
	color: #10b981;
}

.tiny-btn.add-btn:hover {
	background-color: #ecfdf5;
}

.tiny-btn:hover {
	background-color: #fef2f2;
}

/* Modal styles - use Bootstrap defaults, just add responsive tweaks */
.modal-dialog {
	max-width: 90%;
	margin: 1.75rem auto;
}

@media (max-width: 768px) {
	.modal-dialog {
		max-width: 95%;
		margin: 1rem auto;
	}
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
