<template>
	<div class="file-upload-wrap" :class="{ 'is-disabled': disabled }">
		<input
			:id="inputId"
			ref="inputEl"
			type="file"
			:accept="accept"
			:multiple="multiple"
			:capture="capture"
			:disabled="disabled"
			@change="onChange"
			class="file-input-sr"
		/>

		<label class="file-upload" :for="inputId" :aria-disabled="disabled">
			<span v-if="icon" class="file-upload__icon" aria-hidden="true">{{ icon }}</span>
			<span class="file-upload__title">{{ title }}</span>
			<span v-if="hint" class="file-upload__hint">{{ hint }}</span>
		</label>
		<!-- Preview -->
		<div v-if="filesToShow.length" class="file-upload__preview">
			<template v-if="showThumbnails">
				<div
					class="thumb"
					v-for="(f, i) in filesToShow.slice(0, maxPreviews)"
					:key="f.preview || f.name"
				>
					<img :src="f.preview" :alt="f.name || 'Billede ' + (i + 1)" loading="lazy" />
					<button type="button" class="thumb__remove" @click.stop="$emit('remove', i)">
						✕
					</button>
				</div>
				<div v-if="filesToShow.length > maxPreviews" class="thumb more">
					+{{ filesToShow.length - maxPreviews }}
				</div>
			</template>
			<template v-else-if="showCount">
				<p class="file-count">
					Valgt: {{ filesToShow.length }} fil<span v-if="filesToShow.length !== 1"
						>er</span
					>
				</p>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'

export interface FilePreview {
	file: File
	name: string
	preview: string
}

interface Props {
	id?: string
	title?: string
	hint?: string
	icon?: string
	accept?: string
	capture?: boolean | 'user' | 'environment'
	disabled?: boolean
	showCount?: boolean
	showThumbnails?: boolean
	maxPreviews?: number
	files?: FilePreview[]
	multiple?: boolean
	appendMode?: boolean
	maxFiles?: number
}

const props = withDefaults(defineProps<Props>(), {
	id: '',
	title: 'Vælg filer',
	hint: 'Tryk for at vælge (flere tilladt)',
	icon: '📷',
	accept: 'image/*',
	capture: undefined,
	disabled: false,
	showCount: true,
	showThumbnails: true,
	maxPreviews: 4,
	files: () => [],
	multiple: false,
	appendMode: true,
	maxFiles: 10,
})

const emit = defineEmits<{
	(e: 'images', value: Event): void
	(e: 'change', value: Event): void
	(e: 'remove', index: number): void
	(e: 'input-cleared'): void
	(e: 'update:files', value: FilePreview[]): void
}>()

const inputEl = ref<HTMLInputElement | null>(null)
const rnd = Math.random().toString(36).slice(2)
const inputId = computed(() => props.id || `file-${rnd}`)

const filesLocal = ref<FilePreview[]>([])

const filesToShow = computed(() => (props.files?.length ? props.files : filesLocal.value))

function buildPreviews(fileList: FileList | null): FilePreview[] {
	const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
	const arr = Array.from(fileList || []).filter(
		(f) => !allowed.length || allowed.includes(f.type),
	)
	return arr.map((file) => ({
		file,
		name: file.name,
		preview: URL.createObjectURL(file),
	}))
}

function revokeAll(urls: string[]) {
	urls.forEach((u) => {
		try {
			URL.revokeObjectURL(u)
		} catch {
			// Ignore errors when revoking object URLs
		}
	})
}

let lastLocalUrls: string[] = []

function onChange(e: Event) {
	emit('images', e)
	emit('change', e)

	const target = e.target as HTMLInputElement
	const picked = buildPreviews(target.files)
	const current = props.files?.length ? props.files : filesLocal.value
	let next = props.appendMode ? [...current, ...picked] : picked
	if (props.maxFiles && next.length > props.maxFiles) next = next.slice(0, props.maxFiles)

	if (!props.files?.length) {
		if (!props.appendMode) revokeAll(lastLocalUrls)
		filesLocal.value = next
		lastLocalUrls = next.map((p) => p.preview)
	}

	emit('update:files', next)

	if (inputEl.value) inputEl.value.value = ''
}

function clear() {
	if (inputEl.value) inputEl.value.value = ''
	revokeAll(lastLocalUrls)
	filesLocal.value = []
	lastLocalUrls = []
	emit('input-cleared')
}

watch(
	() => props.files,
	(nv: FilePreview[] | undefined, ov: FilePreview[] | undefined) => {
		if (!ov || ov === nv) return
		if (lastLocalUrls.length && props.files?.length) {
			revokeAll(lastLocalUrls)
			filesLocal.value = []
			lastLocalUrls = []
		}
	},
)

onBeforeUnmount(() => {
	revokeAll(lastLocalUrls)
})

defineExpose({ clear })
</script>

<style scoped>
:root {
	--brand: rgb(99, 170, 219);
}

.file-upload-wrap {
	max-width: 720px;
	margin: 24px auto;
	padding: 0 16px;
}

.file-input-sr {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
	border: 0;
}

.file-upload {
	display: grid;
	grid-template-columns: 48px 1fr;
	grid-template-rows: auto auto;
	grid-column-gap: 12px;
	align-items: center;

	border: 2px dashed var(--brand);
	background: var(--brand);
	border-radius: 12px;
	background-color: rgba(99, 169, 219, 0.315);

	padding: 20px 16px;
	text-align: left;
	color: var(--text);
	cursor: pointer;
	min-height: 72px;
}

.file-upload__icon {
	grid-row: 1 / span 2;
	font-size: 28px;
	line-height: 1;
}

.file-upload__title {
	font-size: 16px;
	font-weight: 600;
}

.file-upload__hint {
	font-size: 14px;
	color: var(--muted);
	margin-top: 2px;
}

.file-upload:active {
	transform: scale(0.99);
}

.is-disabled .file-upload {
	opacity: 0.6;
	cursor: not-allowed;
}

@media (forced-colors: active) {
	.file-upload {
		border-style: solid;
	}
}
@media (prefers-reduced-motion: reduce) {
	.file-upload {
		transition: none;
	}
}
@media (max-width: 420px) {
	.file-upload {
		grid-template-columns: 40px 1fr;
		padding: 16px;
		border-radius: 10px;
	}
	.file-upload__icon {
		font-size: 24px;
	}
	.file-upload__title {
		font-size: 15px;
	}
	.file-upload__hint {
		font-size: 13px;
	}
}
.file-upload__preview {
	margin-top: 10px;
}

.file-count {
	margin: 8px 2px 0;
	color: var(--muted);
	font-size: 14px;
}

/* Responsive thumbnail grid */
.file-upload__preview {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
	gap: 8px;
}

.thumb {
	position: relative;
	width: 100%;
	padding-top: 100%; /* square */
	border-radius: 8px;
	overflow: hidden;
	background: #f2f4f7;
	box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
}

.thumb img {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.thumb.more {
	display: grid;
	place-items: center;
	color: var(--text);
	background: var(--brand-10);
	font-weight: 600;
}
.thumb__remove {
	position: absolute;
	top: 6px;
	right: 6px;
	width: 24px;
	height: 24px;
	border-radius: 12px;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
	border: 0;
	cursor: pointer;
	font-size: 14px;
	line-height: 24px;
	text-align: center;
}
.thumb__remove:active {
	transform: scale(0.96);
}
</style>
