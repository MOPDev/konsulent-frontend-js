<template>
	<div>
		<button @click="fetchBesogsbrev" :disabled="loading" class="btn">
			<span v-if="loading">Henter besøgsbrev...</span>
			<span v-else>Print besøgsbrev</span>
		</button>

		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/utils/axios'

const props = defineProps({
	visitId: {
		required: true,
	},
})

const loading = ref(false)
const error = ref(null)

const fetchBesogsbrev = async () => {
	console.log('Fetching besogsbrev for visitId:', props.visitId)
	loading.value = true
	error.value = null

	let url = null
	let printWindow = null

	try {
		const response = await api.get(`/visits/${props.visitId}/besogsbrev`, {
			responseType: 'blob',
		})

		// Create a blob URL for the PDF
		const blob = new Blob([response.data], { type: 'application/pdf' })
		url = URL.createObjectURL(blob)

		// Open the PDF in a hidden iframe and trigger print
		printWindow = window.open(url, '_blank')

		if (!printWindow) {
			// Fallback if popups are blocked - use iframe approach
			const iframe = document.createElement('iframe')
			iframe.style.display = 'none'
			iframe.src = url

			document.body.appendChild(iframe)

			iframe.onload = () => {
				iframe.contentWindow.focus()
				iframe.contentWindow.print()

				// Clean up after print dialog closes
				setTimeout(() => {
					document.body.removeChild(iframe)
					URL.revokeObjectURL(url)
				}, 1000)
			}
		} else {
			// Let the new tab load then trigger print
			printWindow.onload = () => {
				printWindow.focus()
				printWindow.print()
			}

			// Fallback if onload doesn't fire (some browsers)
			setTimeout(() => {
				printWindow.focus()
				printWindow.print()
			}, 1000)
		}
	} catch (err) {
		if (err.response?.data instanceof Blob) {
			const text = await err.response.data.text()
			try {
				const json = JSON.parse(text)
				error.value = json.error || 'Kunne ikke hente besøgsbrev'
			} catch {
				error.value = 'Kunne ikke hente besøgsbrev'
			}
		} else {
			error.value = err.message
		}

		// Clean up blob URL on error
		if (url) URL.revokeObjectURL(url)
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
