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
			</div>
			<div class="canvas-wrapper" ref="canvasWrapper">
				<canvas ref="pdfCanvas" />
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const props = defineProps({
	docBlob: { type: Blob, default: null },
	height: { type: String, default: '600px' },
})

const pdfCanvas = ref(null)
const canvasWrapper = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.2)
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
	const canvas = pdfCanvas.value
	canvas.height = viewport.height
	canvas.width = viewport.width
	await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
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

function print() {
	const canvas = pdfCanvas.value
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
.canvas-wrapper {
	overflow: auto;
	-webkit-overflow-scrolling: touch;
	max-height: v-bind(height);
}
canvas {
	display: block;
	margin: 0 auto;
}
</style>
