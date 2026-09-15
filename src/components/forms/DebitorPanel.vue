<template>
	<div style="margin: 16px">
		<button
			class="debitor-toggle"
			@click="toggleExpanded"
			:aria-expanded="expanded ? 'true' : 'false'"
			aria-controls="debitor-panel"
		>
			<span>Debitor: {{ name }}, Alder: {{ age }}</span>
		</button>
		<div v-if="expanded">
			<DocxPdfViewer :docBlob="docBlob" height="800px" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import DocxPdfViewer from '@/components/DocxPdfViewer.vue'
import { DebitorWithoutVisits } from '@/schemas'

interface Props {
	debitors?: DebitorWithoutVisits[]
	docBlob?: any
}

const props = withDefaults(defineProps<Props>(), {
	debitors: () => [],
	docBlob: null,
})

const expanded = ref(false)
const name = ref('')
const age = ref(0)

function calculateAge(debitor: DebitorWithoutVisits): number {
	const birthDate = parseBirthDateFromSsn(debitor.ssn)

	const diff = Date.now() - birthDate.getTime()
	return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

// ponytail: assumes ssn format DDMMYY (e.g. "061201" = 06 Dec, year 01).
// Cutoff year is derived from current year's last two digits so it keeps
// working as time passes, instead of a hardcoded "27/28" split.
function parseBirthDateFromSsn(ssn: string): Date {
	const day = Number(ssn.slice(0, 2))
	const month = Number(ssn.slice(2, 4))
	const yy = Number(ssn.slice(4, 6))

	const currentYY = new Date().getFullYear() % 100
	const century = yy <= currentYY ? 2000 : 1900
	return new Date(century + yy, month - 1, day)
}

function updateFromDebitors(debitors: DebitorWithoutVisits[]) {
	console.log(debitors[0].ssn)
	for (const debitor of debitors) {
		console.log(debitor)
		if (debitor.name?.length > 0) {
			name.value = debitor.name
			age.value = calculateAge(debitor)
		}
	}
}

onMounted(() => updateFromDebitors(props.debitors ?? []))
watch(
	() => props.debitors,
	(d) => {
		console.log('watch fired')
		updateFromDebitors(d ?? [])
	},
)

const toggleExpanded = () => {
	expanded.value = !expanded.value
}
</script>

<style scoped>
.debitor-toggle {
	background: none;
	border: 0;
	padding: 0;
	font: inherit;
	cursor: pointer;
}
.debitor-toggle::after {
	content: ' ▸';
}
.debitor-toggle[aria-expanded='true']::after {
	content: ' ▾';
}
.debitor-toggle:hover {
	text-decoration: underline;
}
</style>
