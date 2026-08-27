// AuditorView
<template>
	<div class="auditor-view">
		<h2>Konsulent Info</h2>
		<p class="auditor-name" @click="toggleExpanded">Konsulent: {{ auditor?.name }}</p>
		<div v-if="expanded && auditor" class="auditor-details">
			<p>telefonnr: {{ auditor.phone }}</p>
			<p>Mail: {{ auditor.email }}</p>
			<p>id: {{ auditorId }}</p>
		</div>
		<div style="width: 100%">
			<AuditorInformation v-if="auditor" :auditor="auditor" />
			<div v-else>Henter konsulent info…</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { usersApi } from '@/api/users'
import { errorApi } from '@/utils/axios'
import AuditorInformation from '@/components/AuditorInformation.vue'
import type { UserWithVisits } from '@/schemas/index.ts'
const auditor = ref<UserWithVisits | null>(null)

const route = useRoute()
const auditorId = Number(route.params.id)

const expanded = ref<boolean>(false)
function toggleExpanded() {
	expanded.value = !expanded.value
}

usersApi
	.getUser(auditorId)
	.then((response) => {
		auditor.value = response
	})
	.catch((error: any) => {
		console.error('Error fetching auditor data:', error)
		errorApi.log('Error fetching auditor data: ' + error.message)
	})
</script>

<style scoped>
.auditor-view {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: flex-start; /* aligns text to the left */
	gap: 0.2rem; /* space between elements */
}

.auditor-view p {
	font-size: larger;
}

.auditor-details {
	margin-left: 1rem;
	border-left: 2px solid #eee;
	padding-left: 1rem;
}

p.auditor-name {
	cursor: zoom-in;
	font-size: x-large;
}
</style>
