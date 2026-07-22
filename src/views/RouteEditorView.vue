// RouteEditorView.vue //this page displays all the routes and allows editing them // can also add
new ones
<template>
	<div class="card">
		<div v-for="date in Object.keys(visitsByDate).sort()" :key="date" class="visit-group">
			<h3>{{ date.slice(0, 10) }}</h3>
			<VisitCard v-for="(visit, index) in visitsByDate[date]" :key="index" :visit="visit" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import VisitCard from '@/components/VisitCard.vue'
import api from '@/utils/axios'
import { useRoute } from 'vue-router'

interface Visit {
	visit_date: string
	[key: string]: unknown
}

const route = useRoute()

const ID = Number(route.params.id)
const auditor = ref<any>(null)

api.get('/visit-response/all')
	.then((response) => {
		auditor.value = response.data.users.find((user: any) => user.ID === ID)
	})
	.catch((error: any) => {
		console.error('Error fetching auditor data:', error)
	})

const visitsByDate = computed<Record<string, Visit[]>>(() => {
	const visits: Visit[] = auditor.value?.visits || []
	return visits.reduce(
		(dateMap: Record<string, Visit[]>, visit: Visit) => {
			const date = visit.visit_date
			if (!dateMap[date]) {
				dateMap[date] = []
			}
			dateMap[date].push(visit)
			return dateMap
		},
		{} as Record<string, Visit[]>,
	)
})
</script>

<style scoped></style>
