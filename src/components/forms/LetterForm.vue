<template>
	<div style="margin: 16px">
		<h1>Brev</h1>
		<p>
			Du skal bare aflevere brevet til skyldner.
			<br />
			Mest sandsynligt i postkassen. Tag gerne et billede af postkassen på addresen hvis
			navnet ikke står på postkassen.
		</p>
	</div>

	<div style="margin: 16px">
		<button
			class="debitor-toggle"
			@click="toggleExpanded"
			:aria-expanded="expanded ? 'true' : 'false'"
			aria-controls="debitor-panel"
		>
			<span>Debitor: {{ filteredData?.debitors?.[0]?.name ?? '—' }}</span>
		</button>

		<div v-if="expanded">
			<!-- Read-only container for the Word Doc -->
			<div v-if="docBlob" class="document-preview-wrapper">
				<div ref="wordContainer" class="docx-preview-container"></div>
			</div>
		</div>
	</div>

	<form @submit.prevent="emit('submit')">
		<!-- debitor hjemme? -->
		<YesNo
			label="Er debitor hjemme?"
			name="debitor_is_home"
			v-model="fd.debitor_is_home"
			:required="true"
		/>

		<!-- Billede af postkassen -->
		<FileUpload
			id="car-photo"
			title="Billede af postkassen"
			hint="Tryk for at tilføje ét billede ad gangen"
			icon="📷"
			accept="image/*"
			:multiple="false"
			:append-mode="true"
			:files="formData.images"
			@images="(e) => emit('images', e)"
			@remove="removeAt"
			@update:files="onUpdateFiles"
		/>

		<br />
		<label
			>Kommentarer
			<br />

			<textarea
				v-model.trim="fd.comments"
				cols="50"
				rows="4"
				placeholder="Evt. noter"
			></textarea>
		</label>
		<br />
		<button type="submit" :disabled="isSubmitting">Aflever svar</button>
	</form>

	<!--
leasing kan man bare tage bilen
mere målrettet mod aktivet istedet for personen
check bokse er bilen skadet? er den ryddet? hvor langt er bilen kørt lige nu?, 
billeder af bilen 
er bilen tilstede? er den på værkstedet? hvor er den lige nu? hvis ikke hjemme så hvor og hvem kører den?
er bilen tilskade? normale spørgsmål.
--></template>

<script setup>
import { computed, ref, watch } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'
import FileUpload from './FileUpload.vue'
import { renderAsync } from 'docx-preview'

const wordContainer = ref(null)
const expanded = ref(false)
const toggleExpanded = () => {
	expanded.value = !expanded.value
}

const props = defineProps({
	visitData: { type: Object, required: true },
	formData: { type: Object, required: true },
	isSubmitting: { type: Boolean, default: false },
	docBlob: { type: Object, default: null }, // The blob passed from parent
})

// Watch for when the blob is loaded and then render it
watch(
	[() => props.docBlob, wordContainer],
	async ([newBlob, container]) => {
		if (newBlob && container) {
			// Clear previous content before rendering
			container.innerHTML = ''
			try {
				await renderAsync(newBlob, container)
			} catch (e) {
				console.error('docx-preview error:', e)
			}
		}
	},
	{ immediate: true },
)

const emit = defineEmits(['update:formData', 'submit', 'images', 'remove-image'])
function removeAt(index) {
	// do not mutate here; let the owner (FormView) revoke URLs
	emit('remove-image', index)
}
function onUpdateFiles(next) {
	emit('update:formData', { ...props.formData, images: next })
}
const fd = computed({
	get: () => props.formData,
	set: (v) => emit('update:formData', v),
})

function calculateAge(birthday) {
	if (!birthday) return ''
	const birthDate = new Date(birthday)
	const today = new Date()
	let age = today.getFullYear() - birthDate.getFullYear()
	const m = today.getMonth() - birthDate.getMonth()
	if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
		age--
	}
	return age
}

const filteredData = computed(() => {
	const visit = props.visitData || {}
	const debitors = (visit.debitors || []).map((d) => ({
		...d,
		age: calculateAge(d.birthday),
	}))
	return { ...visit, debitors }
})
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
	content: ' ▸'; /* closed */
}
.debitor-toggle[aria-expanded='true']::after {
	content: ' ▾'; /* open */
}
.debitor-toggle:hover {
	text-decoration: underline;
}
</style>
