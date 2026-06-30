<!-- components/DocxPdfViewer.vue -->
<template>
	<div class="pdf-viewer">
		<div v-if="!docBlob">Indlæser...</div>
		<div v-else class="pdf-container">
			<div class="pdf-toolbar">
				<button @click="zoomOut">−</button>
				<span>{{ Math.round(scale * 100) }}%</span>
				<button @click="zoomIn">+</button>
				<button @click="print">🖨</button>
				<button @click="isFullscreen = true" class="fullscreen-btn">⛶</button>
			</div>
			<div class="canvas-wrapper" ref="canvasWrapper">
				<canvas
					v-for="n in totalPages"
					:key="n"
					:ref="(el) => setCanvas(el, n)"
					class="pdf-page"
				/>
			</div>
		</div>

		<!-- Fullscreen overlay -->
		<Teleport to="body">
			<div v-if="isFullscreen" class="fullscreen-overlay">
				<div class="pdf-toolbar">
					<button @click="zoomOut">−</button>
					<span>{{ Math.round(scale * 100) }}%</span>
					<button @click="zoomIn">+</button>
					<button @click="print">🖨</button>
					<button @click="closeFullscreen" class="close-btn">✕</button>
				</div>
				<div class="canvas-wrapper fullscreen-canvas">
					<canvas
						v-for="n in totalPages"
						:key="n"
						:ref="(el) => setCanvasFullscreen(el, n)"
						class="pdf-page"
					/>
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

const canvasWrapper = ref(null)
const totalPages = ref(0)
const scale = ref(1.2)
const isFullscreen = ref(false)

// page -> canvas element maps
const canvasMap = {}
const canvasMapFullscreen = {}

let pdfDoc = null
let objectUrl = null

function setCanvas(el, n) {
	if (el) canvasMap[n] = el
}
function setCanvasFullscreen(el, n) {
	if (el) canvasMapFullscreen[n] = el
}

async function loadPdf(blob) {
	if (objectUrl) URL.revokeObjectURL(objectUrl)
	objectUrl = URL.createObjectURL(blob)
	const arrayBuffer = await blob.arrayBuffer()
	pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
	totalPages.value = pdfDoc.numPages
	await nextTick()
	renderAllPages()
}

async function renderAllPages(fullscreen = false) {
	if (!pdfDoc) return
	for (let n = 1; n <= totalPages.value; n++) {
		await renderPage(n, fullscreen)
	}
}

async function renderPage(num, fullscreen = false) {
	if (!pdfDoc) return
	const page = await pdfDoc.getPage(num)
	const viewport = page.getViewport({ scale: scale.value })
	const map = fullscreen ? canvasMapFullscreen : canvasMap
	const canvas = map[num]
	if (!canvas) return
	canvas.height = viewport.height
	canvas.width = viewport.width
	await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
}

function zoomIn() {
	scale.value = +(scale.value + 0.2).toFixed(1)
	renderAllPages(false)
	if (isFullscreen.value) renderAllPages(true)
}
function zoomOut() {
	scale.value = Math.max(0.4, +(scale.value - 0.2).toFixed(1))
	renderAllPages(false)
	if (isFullscreen.value) renderAllPages(true)
}

async function closeFullscreen() {
	isFullscreen.value = false
}

watch(isFullscreen, async (val) => {
	if (val) {
		await nextTick()
		renderAllPages(true)
	}
})

function onKeydown(e) {
	if (e.key === 'Escape') closeFullscreen()
}
window.addEventListener('keydown', onKeydown)

function print() {
	// print all pages from normal canvases
	const win = window.open('')
	const imgs = Object.keys(canvasMap)
		.sort((a, b) => a - b)
		.map(
			(n) =>
				`<img src="${canvasMap[n].toDataURL()}" style="display:block;margin-bottom:8px" />`,
		)
		.join('')
	win.document.write(`<body>${imgs}</body>`)
	win.document.close()
	win.onload = () => {
		win.print()
		win.close()
	}
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

.pdf-page {
	display: block;
	margin: 0 auto 8px;
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
</style>
