<template>
	<div v-if="isAllowed">
		<!-- if user is on a phone or tablet then dont show anything below -->

		<button @click="PlannerStore.switchTab('createVisits')">Opret besøg</button>
		<button @click="PlannerStore.switchTab('nonPlannedVisits')">Oprettede besøg</button>
		<button @click="PlannerStore.switchTab('planVisits')">Planlæg besøg</button>
		<button @click="PlannerStore.switchTab('plannedVisits')">Planlagte besøg</button>
		<button @click="PlannerStore.switchTab('notVisitedVisits')">Ikke besøgt endnu</button>
		<button @click="PlannerStore.switchTab('reviewVisits')">Gennemgå besøg</button>

		<div style="margin-top: 20px">
			<br />
			--------------------
			<br />
			<component :is="getActiveComponent" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { usePlannerStore } from '@/stores/plannerStore'
import { useAuthStore } from '@/stores/auth'
import CreateVisits from '@/components/CreateVisits.vue'
import NonPlannedVisits from '@/components/NonPlannedVisits.vue'
import MapRoute from '@/components/MapRoute.vue'
import PlannedVisits from '@/components/PlannedVisits.vue'
import NotVisitedVisits from '@/components/NotVisitedVisits.vue'
import ReviewVisits from '@/components/ReviewVisits.vue'

const PlannerStore = usePlannerStore()
const AuthStore = useAuthStore()

const components: Record<string, Component> = {
	createVisits: CreateVisits,
	nonPlannedVisits: NonPlannedVisits,
	planVisits: MapRoute,
	plannedVisits: PlannedVisits,
	notVisitedVisits: NotVisitedVisits,
	reviewVisits: ReviewVisits,
}

const isAllowed = computed<boolean>(() => {
	let allowed = false

	if (AuthStore.user?.rights === 'admin') {
		allowed = true
	}
	if (AuthStore.user?.rights === 'developer') {
		allowed = true
	}
	if (AuthStore.user?.rights === 'office') {
		allowed = true
	}

	return allowed
})

const getActiveComponent = computed<Component>(() => components[PlannerStore.activeTab])
</script>
