<template>
	<div>
		<button @click="fetchBesogsbrev" :disabled="loading" class="btn">
			<span v-if="loading">Henter besøgsbrev...</span>
			<span v-else>Download besøgsbrev</span>
		</button>

		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/utils/axios' // adjust path to your api instance

const props = defineProps({
	visitId: {
		//type: Number,
		required: true,
	},
})

const loading = ref(false)
const error = ref(null)

const fetchBesogsbrev = async () => {
	console.log('Fetching besogsbrev for visitId:', props.visitId)
	loading.value = true
	error.value = null

	try {
		const response = await api.get(`/visits/${props.visitId}/besogsbrev`, {
			responseType: 'blob', // important - tells axios to treat response as binary
		})

		const url = URL.createObjectURL(response.data)

		const a = document.createElement('a')
		a.href = url
		a.download = `besogsbrev_${props.visitId}.docx`
		a.click()

		URL.revokeObjectURL(url)
	} catch (err) {
		// axios wraps blob errors, so we need to parse it
		if (err.response?.data instanceof Blob) {
			const text = await err.response.data.text()
			const json = JSON.parse(text)
			error.value = json.error || 'Kunne ikke hente besøgsbrev'
		} else {
			error.value = err.message
		}
	} finally {
		loading.value = false
	}
}
</script>
<style scoped>
.btn {
	background-color: #2563eb;
	color: #ffffff;
	padding: 0.5rem 1rem;
	border: none;
	border-radius: 0.375rem;
	font-size: 1rem;
	cursor: pointer;
	transition: background-color 0.2s ease;
}

.btn:hover:not(:disabled) {
	background-color: #1d4ed8;
}

.btn:disabled {
	background-color: #93c5fd;
	cursor: not-allowed;
}

.error {
	color: #dc2626;
	margin-top: 0.5rem;
	font-size: 0.875rem;
}
</style>
