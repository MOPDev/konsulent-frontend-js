<template>
	<tr style="width: 100%">
		<td>
			<button
				class="visit-btn"
				:class="buttonClass"
				:disabled="!canVisit"
				@click="canVisit && open()"
			>
				{{ buttonLabel }}
			</button>
		</td>

		<td class="address-cell" @click="copyAddress">
			<span>{{ visit.address }}</span>
			<span class="copy-feedback" :class="{ visible: copied }">✓ Kopieret</span>
		</td>

		<td>{{ formattedAnkomst }}</td>

		<td>{{ visit.sagsnr ?? '—' }}</td>
		<td>
			<BesogsbrevButton :visitId="props.visit.ID" />
		</td>
	</tr>
</template>

<script setup>
import router from '@/router'
import { computed, ref } from 'vue'
import BesogsbrevButton from './forms/BesogsbrevButton.vue'

const props = defineProps({
	visit: Object,
	showExtra: {
		type: Boolean,
		default: false,
	},
})

const copied = ref(false)

const isToday = computed(() => {
	const today = new Date()
	const visitDate = new Date(props.visit.visit_date)
	return (
		today.getFullYear() === visitDate.getFullYear() &&
		today.getMonth() === visitDate.getMonth() &&
		today.getDate() === visitDate.getDate()
	)
})

const canVisit = computed(
	() => !props.visit.visit_response && props.visit.status_id == 3 && isToday.value,
)

const buttonLabel = computed(() => {
	if (canVisit.value) return 'Besøg'
	if (props.visit.status_id === 2) return 'send brev'
	if (props.visit.visit_response || props.visit.status_id > 3) return 'Besøgt'
	return 'Afvent'
})

const buttonClass = computed(() => {
	if (canVisit.value) return 'btn-active'
	if (props.visit.visit_response || props.visit.status_id > 3) return 'btn-visited'
	return 'btn-waiting'
})

const formattedAnkomst = computed(() => {
	const interval = props.visit.visit_interval ?? ''
	const time = props.visit.visit_time ?? ''
	const short = interval.replace(/(\d+):\d+\s*-\s*(\d+):\d+/, '$1-$2')
	if (short && time) return `${short} (${time})`
	if (short) return short
	if (time) return time
	return ''
})

async function copyAddress() {
	try {
		await navigator.clipboard.writeText(props.visit.address)
		copied.value = true
		setTimeout(() => (copied.value = false), 2000)
	} catch (e) {
		console.error('Copy failed', e)
	}
}

function open() {
	router.push({ name: 'form', params: { id: props.visit.ID } })
}
</script>

<style scoped>
.visit-btn {
	min-width: 70px;
	padding: 8px 12px;
	border-radius: 6px;
	border: none;
	font-weight: bold;
	cursor: pointer;
}

.btn-active {
	background-color: #4caf50;
	color: white;
	opacity: 1;
}

.btn-visited {
	background-color: #81c784;
	color: white;
	opacity: 0.6;
	cursor: default;
}

.btn-waiting {
	background-color: #9e9e9e;
	color: white;
	opacity: 0.6;
	cursor: default;
}

.address-cell {
	cursor: pointer;
	position: relative;
	user-select: none;
}

.address-cell:active {
	opacity: 0.6;
}

.copy-feedback {
	margin-left: 8px;
	color: #4caf50;
	font-size: 0.85em;
	opacity: 0;
	transition: opacity 0.3s;
}

.copy-feedback.visible {
	opacity: 1;
}

.action-btn {
	padding: 6px 10px;
	border-radius: 6px;
	border: none;
	background-color: #1976d2;
	color: white;
	font-weight: bold;
	cursor: pointer;
}

.action-btn:hover {
	background-color: #1565c0;
}
</style>
