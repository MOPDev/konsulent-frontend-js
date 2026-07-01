<template>
	<button @click="printAll" :disabled="loading" class="print-day-btn">
		<span v-if="loading">Henter… (~{{ estimated }}s tilbage)</span>
		<span v-else>🖨 Print alle besøgsbreve</span>
	</button>
	<p v-if="error" class="error">{{ error }}</p>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '@/utils/axios'

const props = defineProps({
	visitIds: { type: Array, required: true },
})

const loading = ref(false)
const error = ref(null)
const elapsed = ref(0)

const estimated = computed(() => Math.max(0, Math.ceil(props.visitIds.length * 1 - elapsed.value)))

async function printAll() {
	loading.value = true
	error.value = null
	elapsed.value = 0

	const timer = setInterval(() => elapsed.value++, 1000)

	try {
		const ids = props.visitIds.join(',')
		const response = await api.get(`/visits/besogsbrev/batch?ids=${ids}`, {
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
		}
	} catch (err) {
		error.value = 'Fejl ved hentning af besøgsbreve'
		console.error(err)
	} finally {
		clearInterval(timer)
		loading.value = false
	}
}
</script>

<style scoped>
.print-day-btn {
	padding: 6px 14px;
	border-radius: 6px;
	border: 2px solid #2563eb;
	background: transparent;
	color: #2563eb;
	font-weight: 500;
	cursor: pointer;
	transition: background 0.15s;
}
.print-day-btn:hover:not(:disabled) {
	background: #eff6ff;
}
.print-day-btn:disabled {
	border-color: #93c5fd;
	color: #93c5fd;
	cursor: not-allowed;
}
.error {
	color: #dc2626;
	font-size: 0.875rem;
	margin-top: 0.25rem;
}
</style>
