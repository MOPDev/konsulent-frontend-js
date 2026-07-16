<!-- src/components/forms/LetterForm.vue -->
<template>
	<div class="form-wrapper">
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
				<DocxPdfViewer :docBlob="docBlob" height="800px" />
			</div>
		</div>

		<form @submit.prevent="emit('submit')">
			<!-- ponytail: Pass show-worker-met computed from debitors list to ContactSection -->
			<ContactSection
				:form-data="fd"
				:show-worker-met="filteredData?.debitors?.some((d) => d.is_company)"
				:debitors="filteredData?.debitors || []"
			/>

			<PropertySection :form-data="fd" />

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
			<label>
				Kommentarer
				<br />
				<textarea
					v-model.trim="fd.comments"
					cols="50"
					rows="4"
					placeholder="Evt. noter"
					class="form-control"
				></textarea>
			</label>
			<br />
			<button type="submit" class="btn-submit" :disabled="isSubmitting">
				{{ isSubmitting ? 'Sender...' : 'Aflever svar' }}
			</button>
		</form>
	</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import DocxPdfViewer from '@/components/DocxPdfViewer.vue'
import ContactSection from '@/components/forms/ContactSection.vue'
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
	docBlob: { type: Object, default: null },
})

watch(
	[() => props.docBlob, wordContainer],
	async ([newBlob, container]) => {
		if (newBlob && container) {
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
	content: ' ▸';
}
.debitor-toggle[aria-expanded='true']::after {
	content: ' ▾';
}
.debitor-toggle:hover {
	text-decoration: underline;
}
.form-wrapper {
	width: 100%;
	margin: 0 auto;
}
.form-control {
	padding: 8px 12px;
	border: 2px solid #d1d5db;
	border-radius: 8px;
	font-size: 15px;
	background: #fff;
	width: 100%;
}
.form-control:focus {
	outline: none;
	border-color: rgb(99, 170, 219);
}
.btn-submit {
	display: block;
	width: 100%;
	margin-top: 24px;
	margin-bottom: 80px;
	padding: 14px 24px;
	background: #2563eb;
	color: #fff;
	border: none;
	border-radius: 8px;
	font-size: 16px;
	font-weight: 600;
	font-family: inherit;
	cursor: pointer;
	transition: background-color 0.2s;
}
.btn-submit:hover:not(:disabled) {
	background: #1d4ed8;
}
.btn-submit:disabled {
	background: #93c5fd;
	cursor: not-allowed;
}
</style>
