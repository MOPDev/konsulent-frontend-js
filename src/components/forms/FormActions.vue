<template>
	<FileUpload
		:id="fileUploadId"
		:title="imageTitle"
		hint="Tryk for at tilføje ét billede ad gangen"
		icon="📷"
		accept="image/*"
		:multiple="false"
		:append-mode="true"
		:files="fd.images"
		@images="(e) => emit('images', e)"
		@remove="(i) => emit('remove-image', i)"
		@update:files="
			(next) => {
				fd.images = next
			}
		"
	/>

	<BesogsbrevButton :visit-id="visitId" />

	<div class="field">
		<label class="field__label" for="comments">Kommentarer</label>
		<textarea
			id="comments"
			v-model.trim="fd.comments"
			class="field__textarea"
			rows="4"
			placeholder="Evt. noter"
		></textarea>
	</div>

	<button type="submit" class="btn-submit" :disabled="isSubmitting">
		{{ isSubmitting ? 'Sender...' : 'Aflever svar' }}
	</button>
</template>

<script setup>
import { computed } from 'vue'
import FileUpload from '@/components/forms/FileUpload.vue'
import BesogsbrevButton from '@/components/forms/BesogsbrevButton.vue'

const props = defineProps({
	formData: { type: Object, required: true },
	visitId: { type: [Number, String], required: true },
	isSubmitting: { type: Boolean, default: false },
	imageTitle: { type: String, default: 'Billede af bilen og postkassen' },
	fileUploadId: { type: String, default: 'car-photo' },
})

const emit = defineEmits(['images', 'remove-image'])

const fd = computed({
	get: () => props.formData,
	set: () => {},
})
</script>

<style scoped>
.field {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-top: 16px;
}

.field__label {
	font-size: 15px;
	font-weight: 500;
	color: var(--text);
}

.field__textarea {
	width: 100%;
	box-sizing: border-box;
	padding: 10px 12px;
	border: 2px solid #d1d5db;
	border-radius: 8px;
	font-size: 15px;
	font-family: inherit;
	color: var(--text);
	resize: vertical;
	transition: border-color 0.15s;
	background: #fff;
}

.field__textarea:focus {
	outline: none;
	border-color: rgb(99, 170, 219);
}

.field__textarea::placeholder {
	color: #9ca3af;
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
