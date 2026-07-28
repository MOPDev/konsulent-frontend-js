//BesogsbrevButton.vue
<template>
	<div>
		<button @click="fetchAndPrint" :disabled="loading" class="btn">
			<span v-if="loading">Henter dokumenter...</span>
			<span v-else>Print besøgsbrev</span>
		</button>
		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import api from '@/utils/axios'
import { errorApi } from '@/utils/axios'

interface Props {
	visitId: string | number
}

const props = defineProps<Props>()

const loading = ref(false)
const error = ref<string | null>(null)

async function fetchAndPrint() {
	loading.value = true
	error.value = null

	try {
		const response = await api.get(`/visits/besogsbrev/batch?ids=${props.visitId}`, {
			responseType: 'blob',
		})
		const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
		const w = window.open(url, '_blank')
		if (w) {
			w.onload = () => {
				w.focus()
				w.print()
			}
			setTimeout(() => {
				w.focus()
				w.print()
			}, 1000)
		} else {
			const iframe = document.createElement('iframe')
			iframe.style.display = 'none'
			iframe.src = url
			document.body.appendChild(iframe)
			iframe.onload = () => {
				iframe.contentWindow?.focus()
				iframe.contentWindow?.print()
				setTimeout(() => {
					document.body.removeChild(iframe)
					URL.revokeObjectURL(url)
				}, 1000)
			}
		}
	} catch (err: unknown) {
		errorApi.logError(err)
		const axiosErr = err as { response?: { data: Blob } }
		if (axiosErr.response?.data instanceof Blob) {
			const text = await axiosErr.response.data.text()
			try {
				error.value = JSON.parse(text).error
			} catch {
				error.value = 'Kunne ikke hente dokumenter'
			}
		} else {
			error.value = 'Kunne ikke hente dokumenter'
		}
	} finally {
		loading.value = false
	}
}
</script>

<style scoped>
.btn {
	display: inline-flex;
	align-items: center;
	margin-top: 16px;
	padding: 8px 20px;
	background: transparent;
	color: #2563eb;
	border: 2px solid #2563eb;
	border-radius: 8px;
	font-size: 15px;
	font-weight: 500;
	font-family: inherit;
	cursor: pointer;
	transition:
		background-color 0.15s,
		color 0.15s;
}

.btn:hover:not(:disabled) {
	background: #eff6ff;
}

.btn:disabled {
	border-color: #93c5fd;
	color: #93c5fd;
	cursor: not-allowed;
}

.error {
	color: #dc2626;
	margin-top: 0.5rem;
	font-size: 0.875rem;
}
</style>
