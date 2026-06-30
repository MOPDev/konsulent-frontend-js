<template>
	<div>
		<h1>Velkommen {{ authStore.user.name }}</h1>
		<br />
		<br />

		<div class="card-grid">
			<div v-for="user in users" :key="user.ID" class="card-container">
				<KonsulentCard :konsulent="user" />
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue'
import KonsulentCard from '@/components/KonsulentCard.vue'
import { useAuthStore } from '@/stores/auth.js'
import api from '@/utils/axios.js'
import { errorApi } from '@/utils/axios'

const authStore = useAuthStore()

const users = ref([])

api.get('/visit-response/all')
	.then((response) => {
		users.value = response.data.users.filter((user) => user.ID !== 1)
	})
	.catch((error) => {
		errorApi.log('Error fetching users: ' + error.message)
	})
</script>

<style>
.card-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
}

.card-container {
	width: fit-content;
	flex-basis: calc(
		(100% - 48px) / 4
	); /* Adjust this value to change the number of cards per row */
}

@media (max-width: 768px) {
	.card-container {
		flex-basis: calc((100% - 16px) / 2);
	}
}

@media (max-width: 480px) {
	.card-container {
		flex-basis: 100%;
	}
}
</style>
