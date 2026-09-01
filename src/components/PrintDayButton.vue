<template>
	<button @click="printAll" :disabled="loading" class="print-day-btn">
		<span v-if="loading">Henter… (~{{ estimated }}s tilbage)</span>
		<span v-else>🖨 Print alle dokumenter</span>
	</button>
	<p v-if="error" class="error">{{ error }}</p>
</template>

<script setup lang="ts">
import { ref, computed, type ComputedRef } from 'vue'
import api from '@/utils/axios'
import { errorApi } from '@/utils/axios'
import axios from 'axios'
import type { VisitWithoutUserOrDebitors } from '@/schemas/index.js'

const props = defineProps<{
	visitIds: VisitWithoutUserOrDebitors[]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const elapsed = ref(0)

// ponytail: 1.5s per visit is a rough guess for docx→pdf; tune if conversions are faster
const estimated: ComputedRef<number> = computed(() =>
	Math.max(0, Math.ceil(props.visitIds.length * 1.5 - elapsed.value)),
)

async function printAll() {
	loading.value = true
	error.value = null
	elapsed.value = 0

	const timer = setInterval(() => elapsed.value++, 1000)

	const activeVisits = props.visitIds.filter((visit) => visit.cancelled !== true)

	try {
		const ids = activeVisits.map((v) => v.ID).join(',')
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
		let errorMessage = 'Der opstod en fejl under hentning af dokumenter.'

		if (axios.isAxiosError(err)) {
			const data = err.response?.data

			if (data instanceof Blob) {
				try {
					// Read the blob content as a text string
					const text = await data.text()
					const json = JSON.parse(text)
					errorMessage = json.error || json.message || text
				} catch {
					// If it fails to parse as JSON, fallback to err.message
					errorMessage = err.message
				}
			} else if (typeof data === 'object' && data !== null) {
				errorMessage = data.error || data.message || err.message
			} else {
				errorMessage = err.message
			}
		} else if (err instanceof Error) {
			errorMessage = err.message
		}

		error.value = errorMessage
		console.error(err)
		errorApi.logError(err)
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
