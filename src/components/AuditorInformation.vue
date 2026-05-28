//AuditorInformation.vue
<template>
	<div class="auditor-view"></div>
	<div v-for="group in groupedVisitsByDate" :key="group.date" class="visit-group">
		<h3 class="date-header">
			{{
				new Date(group.date).toLocaleDateString('da-DK', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
			}}
		</h3>

		<div class="table-responsive">
			<table class="visit-table">
				<thead>
					<tr>
						<th>Status</th>
						<th>Adresse</th>
						<th>Ankomst</th>
					</tr>
				</thead>
				<tbody>
					<VisitCard v-for="visit in group.visits" :key="visit.id" :visit="visit" />
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import VisitCard from './VisitCard.vue'
import { useAuthStore, USER_RIGHTS } from '@/stores/auth.js'

const props = defineProps({
	auditor: {
		// prop name should match usage in parent components
		type: Object,
		required: true,
	},
})

// Helper: get today's date in YYYY-MM-DD
function getTodayString() {
	const today = new Date()
	const yyyy = today.getFullYear()
	const mm = String(today.getMonth() + 1).padStart(2, '0')
	const dd = String(today.getDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}`
}

const authStore = useAuthStore()
const user = computed(() => authStore.user) // user could change

// Only recompute visits to display if props or user change
const visibleVisits = computed(() => {
	const allVisits = props.auditor?.visits || [] // remove the ? at some point
	const role = user.value?.rights

	if (role === USER_RIGHTS.ADMIN || role === USER_RIGHTS.DEV) {
		return allVisits
	} else if (role === USER_RIGHTS.USER || role === USER_RIGHTS.AUDITOR) {
		const todayString = getTodayString()
		return allVisits.filter((visit) => {
			// Extract only the date part, ignore time and timezone
			const visitDay = visit.visit_date?.slice(0, 10)
			const retnStemnt = new Date(visitDay) >= new Date(todayString) && visit.status_id === 3
			return retnStemnt
		})
	} else {
		// Optional: handle other roles
		console.error('Unknown user role:', role)
		return []
	}
})

const timeToMs = (t) => {
	if (!t) return 0
	const [h, m = 0, s = 0] = t.split(':').map(Number)
	return ((h * 60 + m) * 60 + s) * 1000
}

const dayFromUtcISO = (iso) => iso.slice(0, 10) // "YYYY-MM-DD" from ISO-UTC

// Group visits by date, sorted by date (newest/oldest as needed)
const groupedVisitsByDate = computed(() => {
	// 1) Sort globally by date+time to keep final order stable
	const sorted = [...visibleVisits.value].sort((a, b) => {
		const aKey = Date.parse(`${dayFromUtcISO(a.visit_date)}T${a.visit_time || '00:00:00'}Z`)
		const bKey = Date.parse(`${dayFromUtcISO(b.visit_date)}T${b.visit_time || '00:00:00'}Z`)
		return aKey - bKey
	})

	// 2) Group by day
	const map = new Map()
	for (const v of sorted) {
		const day = dayFromUtcISO(v.visit_date)
		if (!map.has(day)) map.set(day, [])
		map.get(day).push(v)
	}

	// 3) Ensure each day's items are sorted by visit_time
	for (const arr of map.values()) {
		arr.sort((a, b) => timeToMs(a.visit_time) - timeToMs(b.visit_time))
	}

	// 4) ensure there is only data in the future or today
	const todayString = getTodayString()
	for (const [date] of map.entries()) {
		if (date < todayString) {
			map.delete(date)
		}
	}

	return [...map.entries()].map(([date, visits]) => ({ date, visits }))
})
</script>

<style scoped>
.auditor-view {
	padding: 1rem;
}
.table-responsive {
	width: 100%;
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
	margin-bottom: 1rem;
}
.visit-table {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0 0.5em;
	background: white;
	white-space: nowrap;
}
.visit-table th,
.visit-table td {
	padding: 0.5rem 0.75rem;
	text-align: left;
}
.visit-table th {
	background: #f5f5fb;
	border-bottom: 1px solid #ddd;
	font-weight: 600;
}
.visit-table tr {
	background: #fff;
	border-radius: 8px;
	box-shadow: 0 0 0 1px #e5e5e5;
}
.checkmark-cell {
	width: 2rem;
	text-align: center;
}
.date-header {
	margin-top: 1.25rem;
	margin-bottom: 0.125rem;
	font-size: 1.15em;
	font-weight: bold;
}
.visit-group {
	width: 100%;
	margin-bottom: 1.5rem;
}
@media (max-width: 768px) {
	.visit-table th,
	.visit-table td {
		padding: 0.375rem 0.5rem;
		font-size: 0.875rem;
	}
	.date-header {
		font-size: 1em;
	}
}
@media (max-width: 480px) {
	.auditor-view {
		padding: 0.5rem;
	}
}
</style>
