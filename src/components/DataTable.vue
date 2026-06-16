<template>
	<div>
		<!-- Filters -->
		<div class="filters" v-if="filterable">
			<input
				v-for="column in filterableColumns"
				:key="column.key"
				v-model="filters[column.key]"
				:placeholder="`Filtrer ${column.label}...`"
				class="filter-input"
			/>
		</div>

		<!-- Table -->
		<table>
			<thead>
				<tr>
					<th v-if="selectable">
						<input type="checkbox" :checked="isSelectAll" @change="selectAll($event)" />
					</th>
					<th
						v-for="column in columns"
						:key="column.key"
						@click="column.sortable ? sort(column.key) : null"
						:class="{
							sortable: column.sortable,
							'sort-active': sortKey === column.key,
						}"
					>
						{{ column.label }}
						<span
							v-if="column.sortable && sortKey === column.key"
							class="sort-indicator"
						>
							{{ sortOrder === 'asc' ? '↑' : '↓' }}
						</span>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(item, index) in paginatedData" :key="`${item.sagsnr}-${index}`">
					<td v-if="selectable">
						<input
							type="checkbox"
							:checked="isSelected(item)"
							@change="toggleSelection(item, $event.target.checked)"
						/>
					</td>
					<td v-for="column in columns" :key="column.key">
						<slot
							:name="`cell-${column.key}`"
							:item="item"
							:index="index"
							:value="getNestedValue(item, column.key)"
						>
							{{ getNestedValue(item, column.key) }}
						</slot>
					</td>
				</tr>
			</tbody>
		</table>

		<!-- Pagination -->
		<div class="pagination" v-if="paginated">
			<button @click="currentPage--" :disabled="currentPage === 1">Previous</button>
			<span>Page {{ currentPage }} of {{ totalPages }}</span>
			<button @click="currentPage++" :disabled="currentPage === totalPages">Next</button>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
	data: { type: Array, required: true },
	columns: { type: Array, required: true },
	selectable: { type: Boolean, default: false },
	filterable: { type: Boolean, default: false },
	paginated: { type: Boolean, default: false },
	pageSize: { type: Number, default: 10 },
	modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits([
	'selection-changed', // legacy: indices
	'selection-ids-changed', // new: IDs
	'update:selectedItems', // optional v-model for indices
	'update:selectedVisitIds', // optional v-model for IDs
])

const selectedItems = ref([])
const selectedVisitIds = ref([])

// Sync with v-model
watch(
	() => props.modelValue,
	(newVal) => {
		selectedVisitIds.value = newVal || []
	},
	{ immediate: true },
)

const clearSelection = () => {
	selectedItems.value = []
	selectedVisitIds.value = []
	emit('update:modelValue', [])
}

defineExpose({
	clearSelection,
})

const sortKey = ref('')
const sortOrder = ref('asc')
const filters = ref({})
const currentPage = ref(1)

const filterableColumns = computed(() => props.columns.filter((col) => col.filterable))

const filteredData = computed(() => {
	let result = [...props.data]

	// Apply filters first
	Object.entries(filters.value).forEach(([key, value]) => {
		if (value) {
			result = result.filter((item) =>
				String(item[key]).toLowerCase().includes(value.toLowerCase()),
			)
		}
	})

	// Apply sorting
	if (sortKey.value) {
		result.sort((a, b) => {
			const aVal = a[sortKey.value]
			const bVal = b[sortKey.value]
			const modifier = sortOrder.value === 'asc' ? 1 : -1

			// Handle null/undefined values
			if (aVal == null && bVal == null) return 0
			if (aVal == null) return 1 * modifier
			if (bVal == null) return -1 * modifier

			// Number comparison
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				return (aVal - bVal) * modifier
			}

			// String comparison
			return String(aVal).localeCompare(String(bVal)) * modifier
		})
	}

	return result
})

const totalPages = computed(() => Math.ceil(filteredData.value.length / props.pageSize))

const paginatedData = computed(() => {
	if (!props.paginated) return filteredData.value

	const start = (currentPage.value - 1) * props.pageSize
	return filteredData.value.slice(start, start + props.pageSize)
})

// “all selected” should reflect the current view
const isSelectAll = computed(() => {
	const rows = filteredData.value // or paginatedData.value
	if (!rows.length) return false
	const idsOnView = rows.map((r) => r.ID)
	return idsOnView.every((id) => selectedVisitIds.value.includes(id))
})
// Fix the sort function to handle column sortability
const sort = (key) => {
	const column = props.columns.find((col) => col.key === key)
	if (!column?.sortable) return

	if (sortKey.value === key) {
		sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
	} else {
		sortKey.value = key
		sortOrder.value = 'asc'
	}
}

// select/deselect all currently visible rows (use filteredData or paginatedData as you intend)
const selectAll = (event) => {
	const checked = event.target.checked
	const rows = filteredData.value // or paginatedData.value

	let idsOnView
	if (rows[0].ID === undefined) {
		idsOnView = rows.map((r) => String(r.sagsnr) + String(r.index))
	} else {
		idsOnView = rows.map((r) => r.ID)
	}

	if (checked) {
		// IDs
		const idSet = new Set(selectedVisitIds.value.concat(idsOnView))
		selectedVisitIds.value = Array.from(idSet)
		// indices relative to current view (legacy behavior)
		const viewIdx = rows.map((_, i) => i)
		const idxSet = new Set(selectedItems.value.concat(viewIdx))
		selectedItems.value = Array.from(idxSet)
	} else {
		// remove only those currently visible
		const idsToRemove = new Set(idsOnView)
		selectedVisitIds.value = selectedVisitIds.value.filter((id) => !idsToRemove.has(id))
		// drop indices of the current view
		const viewIdx = new Set(rows.map((_, i) => i))
		selectedItems.value = selectedItems.value.filter((i) => !viewIdx.has(i))
	}
}

function isSelected(item) {
	selectedVisitIds

	let id
	if (item.ID === undefined) {
		id = String(item.sagsnr) + String(item.index)
	} else {
		id = item.ID
	}

	return selectedVisitIds.value.includes(id)
}

function toggleSelection(item, checked) {
	// keep both arrays in sync atomically
	let id
	if (item.ID === undefined) {
		id = String(item.sagsnr) + String(item.index)
	} else {
		id = item.ID
	}
	const idx = paginatedData.value.findIndex((x) => x.ID === id)

	if (checked) {
		if (!selectedVisitIds.value.includes(id)) selectedVisitIds.value.push(id)
		if (!selectedItems.value.includes(idx)) selectedItems.value.push(idx)
	} else {
		selectedVisitIds.value = selectedVisitIds.value.filter((x) => x !== id)
		selectedItems.value = selectedItems.value.filter((i) => i !== idx)
	}
}

// Reset pagination when data changes
watch(
	[sortKey, sortOrder, filters],
	() => {
		currentPage.value = 1
	},
	{ deep: true },
)

// Also watch for data changes
watch(
	() => props.data,
	() => {
		currentPage.value = 1
	},
)

// Add this watcher to emit selection changes
watch(
	[selectedItems, selectedVisitIds],
	([items, ids]) => {
		// legacy event (don’t break existing parents)
		emit('selection-changed', items)

		// new parallel event
		emit('selection-ids-changed', ids)

		// v-model-style updates (optional but recommended)
		emit('update:selectedItems', items)
		emit('update:selectedVisitIds', ids)
	},
	{ deep: true },
)

// Add helper function for nested properties
const getNestedValue = (obj, path) => {
	return path.split('.').reduce((current, key) => current?.[key], obj)
}
</script>

<style scoped>
/* Container */
.filters {
	margin-bottom: 1.5rem;
	display: flex;
	gap: 1rem;
	flex-wrap: wrap;
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

/* Table */
table {
	width: 100%;
	border-collapse: collapse;
	background: white;
	border-radius: 0.5rem;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

thead {
	background-color: #f8fafc;
	border-bottom: 1px solid #e2e8f0;
}

th {
	padding: 0.75rem 1rem;
	text-align: left;
	font-weight: 600;
	color: #374151;
	font-size: 0.875rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

td {
	padding: 0.75rem 1rem;
	border-bottom: 1px solid #f1f5f9;
	color: #1f2937;
}

tbody tr:hover {
	background-color: #f8fafc;
}

tbody tr:last-child td {
	border-bottom: none;
}

/* Sortable columns */
.sortable {
	cursor: pointer;
	user-select: none;
	transition: background-color 0.2s;
}

.sortable:hover {
	background-color: #e2e8f0;
}

.sort-active {
	background-color: #dbeafe;
	color: #1e40af;
}

.sort-indicator {
	margin-left: 0.5rem;
	font-weight: bold;
	color: #3b82f6;
}

/* Checkboxes */
input[type='checkbox'] {
	width: 1rem;
	height: 1rem;
	cursor: pointer;
}

/* Pagination */
.pagination {
	margin-top: 1.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 1rem;
}

.pagination button {
	padding: 0.5rem 1rem;
	border: 1px solid #d1d5db;
	background: white;
	border-radius: 0.375rem;
	cursor: pointer;
	font-size: 0.875rem;
	transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
	background-color: #f3f4f6;
	border-color: #9ca3af;
}

.pagination button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.pagination span {
	font-size: 0.875rem;
	color: #6b7280;
}

/* Responsive */
@media (max-width: 768px) {
	.filters {
		flex-direction: column;
	}

	.filter-input {
		width: 100%;
	}

	table {
		font-size: 0.875rem;
	}

	th,
	td {
		padding: 0.5rem;
	}
}
</style>
