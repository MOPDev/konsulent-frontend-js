<!-- components/DocxPdfViewer.vue -->
<template>
	<div class="pdf-viewer">
		<div v-if="!docBlob">Indlæser...</div>
		<div v-else class="pdf-container">
			<div class="pdf-toolbar">
				<button @click="prevPage" :disabled="currentPage <= 1">‹</button>
				<span>{{ currentPage }} / {{ totalPages }}</span>
				<button @click="nextPage" :disabled="currentPage >= totalPages">›</button>
				<button @click="zoomOut">−</button>
				<span>{{ Math.round(scale * 100) }}%</span>
				<button @click="zoomIn">+</button>
				<button @click="print">🖨</button>
				<button @click="isFullscreen = true" class="fullscreen-btn">⛶</button>
			</div>
			<div class="canvas-wrapper" ref="canvasWrapper">
				<canvas ref="pdfCanvas" />
			</div>
		</div>

		<!-- Fullscreen overlay -->
		<Teleport to="body">
			<div v-if="isFullscreen" class="fullscreen-overlay">
				<div class="pdf-toolbar">
					<button @click="prevPage" :disabled="currentPage <= 1">‹</button>
					<span>{{ currentPage }} / {{ totalPages }}</span>
					<button @click="nextPage" :disabled="currentPage >= totalPages">›</button>
					<button @click="zoomOut">−</button>
					<span>{{ Math.round(scale * 100) }}%</span>
					<button @click="zoomIn">+</button>
					<button @click="print">🖨</button>
					<button @click="closeFullscreen" class="close-btn">✕</button>
				</div>
				<div class="canvas-wrapper fullscreen-canvas">
					<canvas ref="pdfCanvasFullscreen" />
				</div>
			</div>
		</Teleport>
	</div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const props = defineProps({
	docBlob: { type: Blob, default: null },
	height: { type: String, default: '600px' },
})

const pdfCanvas = ref(null)
const pdfCanvasFullscreen = ref(null)
const canvasWrapper = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.2)
const isFullscreen = ref(false)
let pdfDoc = null
let objectUrl = null

async function loadPdf(blob) {
	if (objectUrl) URL.revokeObjectURL(objectUrl)
	objectUrl = URL.createObjectURL(blob)
	const arrayBuffer = await blob.arrayBuffer()
	pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
	totalPages.value = pdfDoc.numPages
	currentPage.value = 1
	renderPage(currentPage.value)
}

async function renderPage(num) {
	if (!pdfDoc) return
	const page = await pdfDoc.getPage(num)
	const viewport = page.getViewport({ scale: scale.value })

	// render normal
	if (pdfCanvas.value) {
		const canvas = pdfCanvas.value
		canvas.height = viewport.height
		canvas.width = viewport.width
		await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
	}

	// render fullscreen canvas if open
	if (isFullscreen.value && pdfCanvasFullscreen.value) {
		const canvas = pdfCanvasFullscreen.value
		canvas.height = viewport.height
		canvas.width = viewport.width
		await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
	}
}

function prevPage() {
	if (currentPage.value > 1) {
		currentPage.value--
		renderPage(currentPage.value)
	}
}
function nextPage() {
	if (currentPage.value < totalPages.value) {
		currentPage.value++
		renderPage(currentPage.value)
	}
}
function zoomIn() {
	scale.value = +(scale.value + 0.2).toFixed(1)
	renderPage(currentPage.value)
}
function zoomOut() {
	scale.value = Math.max(0.4, +(scale.value - 0.2).toFixed(1))
	renderPage(currentPage.value)
}

async function closeFullscreen() {
	isFullscreen.value = false
	// re-render normal canvas after overlay gone
	await nextTick()
	renderPage(currentPage.value)
}

// when fullscreen opens, render into new canvas
watch(isFullscreen, async (val) => {
	if (val) {
		await nextTick()
		renderPage(currentPage.value)
	}
})

// close on Escape
function onKeydown(e) {
	if (e.key === 'Escape') closeFullscreen()
}
window.addEventListener('keydown', onKeydown)

function print() {
	const canvas = isFullscreen.value ? pdfCanvasFullscreen.value : pdfCanvas.value
	const win = window.open('')
	win.document.write(`<img src="${canvas.toDataURL()}" onload="window.print();window.close()" />`)
}

watch(
	() => props.docBlob,
	(blob) => {
		if (blob) loadPdf(blob)
	},
	{ immediate: true },
)

onUnmounted(() => {
	if (objectUrl) URL.revokeObjectURL(objectUrl)
	window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.pdf-viewer {
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	background: #f9f9f9;
	overflow: hidden;
}
.pdf-toolbar {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	background: #333;
	color: white;
	flex-wrap: wrap;
}
.pdf-toolbar button {
	background: #555;
	color: white;
	border: none;
	padding: 4px 10px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 16px;
	touch-action: manipulation;
}
.pdf-toolbar button:disabled {
	opacity: 0.4;
}

.fullscreen-btn {
	margin-left: auto;
}

.close-btn {
	margin-left: auto;
	background: #c0392b !important;
	font-weight: bold;
}

.canvas-wrapper {
	overflow: auto;
	-webkit-overflow-scrolling: touch;
	max-height: v-bind(height);
}

/* Fullscreen overlay */
.fullscreen-overlay {
	position: fixed;
	inset: 0;
	z-index: 9999;
	background: #1a1a1a;
	display: flex;
	flex-direction: column;
}

.fullscreen-canvas {
	flex: 1;
	max-height: none;
	overflow: auto;
	-webkit-overflow-scrolling: touch;
}

canvas {
	display: block;
	margin: 0 auto;
}
</style>
