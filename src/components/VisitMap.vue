// VisitMap.vue
<template>
	<div class="map-wrapper">
		<div ref="mapContainer" class="map-container" @contextmenu.prevent></div>

		<div v-if="mode === 'group'" class="map-toolbar">
			<button
				:class="{ active: activeTool === 'pointer' }"
				title="Vælg"
				@click="setTool('pointer')"
			>
				↖
			</button>
			<button
				:class="{ active: activeTool === 'select' }"
				:title="activeTool === 'select' ? 'Tegn polygon for at vælge' : 'Tegn polygon'"
				@click="setTool('select')"
			>
				◇
			</button>
			<button v-if="isDrawing" class="btn-done" @click="finishDrawing">✓ Færdig</button>
			<button v-if="isDrawing" class="btn-cancel" @click="cancelDrawing">✗ Fortryd</button>
		</div>

		<div v-if="selectedVisitIds.length && mode === 'group'" class="selection-info">
			{{ selectedVisitIds.length }} besøg valgt
			<button class="btn-clear" @click="clearSelection">Fjern valg</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { styleUrl } from '@/api/maptiler'

interface MapVisit {
	ID: number
	latitude: string | number
	longitude: string | number
	group_id?: number | null
	stop_nr?: number | null
	segment_index?: number | null
}

const props = withDefaults(
	defineProps<{
		visits: MapVisit[]
		mode?: 'view' | 'group'
		showRoute?: boolean
		center?: [number, number]
		zoom?: number
		maxBounds?: [[number, number], [number, number]]
		modelValue?: number[]
	}>(),
	{
		mode: 'view',
		showRoute: false,
		center: () => [10.5, 55.5],
		zoom: 7,
		modelValue: () => [],
	},
)

const emit = defineEmits<{
	'visit-click': [id: number]
	'selection-changed': [ids: number[]]
	'update:modelValue': [ids: number[]]
}>()

const mapContainer = ref<HTMLElement>()
let map: maplibregl.Map | null = null

const activeTool = ref<'pointer' | 'select'>('pointer')
const isDrawing = ref(false)
const drawVertices = ref<[number, number][]>([])
const selectedVisitIds = ref<number[]>([...props.modelValue])

const SRC = {
	visits: 'visits-src',
	route: 'route-src',
	draw: 'draw-src',
	sel: 'sel-src',
}
const LAYER = {
	visits: 'visits-layer',
	route: 'route-layer',
	sel: 'sel-layer',
	drawFill: 'draw-fill',
	drawLine: 'draw-line',
	drawVerts: 'draw-verts',
}

// --- Selection sync ---
watch(selectedVisitIds, (ids) => {
	emit('selection-changed', ids)
	emit('update:modelValue', ids)
	if (map?.isStyleLoaded()) updateSelSource()
})
watch(
	() => props.modelValue,
	(ids) => {
		if (ids.join(',') !== selectedVisitIds.value.join(',')) {
			selectedVisitIds.value = [...ids]
		}
	},
)

function setTool(tool: 'pointer' | 'select') {
	if (isDrawing.value) cancelDrawing()
	activeTool.value = tool
	updateCursor()
}

function updateCursor() {
	if (!map) return
	map.getCanvas().style.cursor =
		activeTool.value === 'select' || isDrawing.value ? 'crosshair' : ''
}

function clearSelection() {
	selectedVisitIds.value = []
}

function toggleSelection(id: number) {
	const idx = selectedVisitIds.value.indexOf(id)
	if (idx === -1) {
		selectedVisitIds.value = [...selectedVisitIds.value, id]
	} else {
		selectedVisitIds.value = selectedVisitIds.value.filter((v) => v !== id)
	}
}

// --- GeoJSON builders ---
function toCoord(v: MapVisit): [number, number] | null {
	const lat = Number(v.latitude)
	const lng = Number(v.longitude)
	if (isNaN(lat) || isNaN(lng)) return null
	return [lng, lat]
}

function buildVisitsFC(): GeoJSON.FeatureCollection {
	const features = props.visits
		.map((v) => {
			const c = toCoord(v)
			if (!c) return null
			return {
				type: 'Feature' as const,
				geometry: { type: 'Point' as const, coordinates: c },
				properties: {
					id: v.ID,
					stop_nr: v.stop_nr,
					segment_index: v.segment_index,
					group_id: v.group_id,
				},
			}
		})
		.filter((f): f is GeoJSON.Feature => f !== null)
	return { type: 'FeatureCollection', features }
}

function buildRouteFC(): GeoJSON.FeatureCollection | null {
	const sorted = [...props.visits]
		.map((v) => ({ v, c: toCoord(v) }))
		.filter((x): x is { v: MapVisit; c: [number, number] } => x.c !== null)
		.sort((a, b) => (a.v.stop_nr ?? 0) - (b.v.stop_nr ?? 0))

	if (sorted.length < 2) return null

	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: sorted.map((x) => x.c),
				},
				properties: {},
			},
		],
	}
}

function buildSelFC(): GeoJSON.FeatureCollection {
	const ids = new Set(selectedVisitIds.value)
	const features = props.visits
		.map((v) => {
			const c = toCoord(v)
			if (!c || !ids.has(v.ID)) return null
			return {
				type: 'Feature' as const,
				geometry: { type: 'Point' as const, coordinates: c },
				properties: { id: v.ID, group_id: v.group_id },
			}
		})
		.filter((f): f is GeoJSON.Feature => f !== null)
	return { type: 'FeatureCollection', features }
}

function buildDrawFC(): GeoJSON.FeatureCollection {
	const verts = drawVertices.value
	const features: GeoJSON.Feature[] = []

	if (verts.length >= 2) {
		features.push({
			type: 'Feature',
			geometry: {
				type: 'LineString',
				coordinates: isDrawing.value ? verts : [...verts, verts[0]],
			},
			properties: {},
		})
	}

	verts.forEach((v) => {
		features.push({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: v },
			properties: {},
		})
	})

	return { type: 'FeatureCollection', features }
}

// --- Point in polygon (ray casting) ---
function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
	let inside = false
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i]
		const [xj, yj] = polygon[j]
		if (
			yi > point[1] !== yj > point[1] &&
			point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
		) {
			inside = !inside
		}
	}
	return inside
}

// --- Drawing ---
function updateDrawSource() {
	const src = map?.getSource(SRC.draw) as maplibregl.GeoJSONSource | undefined
	src?.setData(buildDrawFC())
}

function runSelection() {
	const verts = drawVertices.value
	if (verts.length < 3) {
		cancelDrawing()
		return
	}

	const selected = props.visits.filter((v) => {
		const c = toCoord(v)
		return c && pointInPolygon(c, verts)
	})

	const existing = new Set(selectedVisitIds.value)
	selected.forEach((v) => existing.add(v.ID))
	selectedVisitIds.value = Array.from(existing)

	cancelDrawing()
}

function handleMapClick(e: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }) {
	if (activeTool.value !== 'select') return

	if (!isDrawing.value) {
		isDrawing.value = true
		drawVertices.value = [[e.lngLat.lng, e.lngLat.lat]]
		updateDrawSource()
		updateCursor()
		return
	}

	const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat]
	const first = drawVertices.value[0]
	const dist = Math.sqrt((pt[0] - first[0]) ** 2 + (pt[1] - first[1]) ** 2)

	if (drawVertices.value.length >= 3 && dist < 0.001) {
		runSelection()
		return
	}

	drawVertices.value = [...drawVertices.value, pt]
	updateDrawSource()
}

function finishDrawing() {
	if (drawVertices.value.length >= 3) runSelection()
	else cancelDrawing()
}

function cancelDrawing() {
	isDrawing.value = false
	drawVertices.value = []
	updateDrawSource()
	updateCursor()
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') cancelDrawing()
	else if (e.key === 'Enter' && isDrawing.value) finishDrawing()
}

// --- Map setup ---
// ponytail: `any` avoids massive TS friction with maplibre's strictly typed layer specs.
function ensureLayer(id: string, spec: any) {
	if (!map) return
	if (map.getLayer(id)) return
	map.addLayer({ id, ...spec })
}

function emptyFC(): GeoJSON.FeatureCollection {
	return { type: 'FeatureCollection', features: [] }
}

function ensureSource(id: string, data: GeoJSON.FeatureCollection | GeoJSON.Feature) {
	if (!map) return
	if (map.getSource(id)) {
		;(map.getSource(id) as maplibregl.GeoJSONSource).setData(data)
	} else {
		map.addSource(id, { type: 'geojson', data })
	}
}

function addBaseLayers() {
	if (!map || !map.isStyleLoaded()) return

	const visitsFC = buildVisitsFC()
	const routeFC = props.showRoute ? buildRouteFC() : null

	ensureSource(SRC.visits, visitsFC)
	ensureLayer(LAYER.visits, {
		type: 'circle',
		source: SRC.visits,
		paint: {
			'circle-radius': 8,
			'circle-color': '#3b82f6',
			'circle-stroke-color': '#ffffff',
			'circle-stroke-width': 2,
		},
	})

	ensureSource(SRC.route, routeFC ?? emptyFC())
	if (props.showRoute && routeFC) {
		ensureLayer(LAYER.route, {
			type: 'line',
			source: SRC.route,
			paint: {
				'line-color': '#6366f1',
				'line-width': 3,
				'line-opacity': 0.7,
				'line-dasharray': [2, 2],
			},
		})
		map.setLayoutProperty(LAYER.route, 'visibility', 'visible')
	} else {
		if (map.getLayer(LAYER.route)) {
			map.setLayoutProperty(LAYER.route, 'visibility', 'none')
		}
	}

	ensureSource(SRC.sel, buildSelFC())
	ensureLayer(LAYER.sel, {
		type: 'circle',
		source: SRC.sel,
		paint: {
			'circle-radius': 10,
			'circle-color': '#f59e0b',
			'circle-stroke-color': '#ffffff',
			'circle-stroke-width': 3,
		},
	})

	if (props.mode === 'group') {
		ensureSource(SRC.draw, buildDrawFC())
		ensureLayer(LAYER.drawFill, {
			type: 'fill',
			source: SRC.draw,
			paint: { 'fill-color': '#6366f1', 'fill-opacity': 0.15 },
			filter: ['==', '$type', 'Polygon'],
		})
		ensureLayer(LAYER.drawLine, {
			type: 'line',
			source: SRC.draw,
			paint: { 'line-color': '#6366f1', 'line-width': 2, 'line-dasharray': [3, 2] },
			filter: ['==', '$type', 'LineString'],
		})
		ensureLayer(LAYER.drawVerts, {
			type: 'circle',
			source: SRC.draw,
			paint: {
				'circle-radius': 5,
				'circle-color': '#6366f1',
				'circle-stroke-color': '#ffffff',
				'circle-stroke-width': 2,
			},
			filter: ['==', '$type', 'Point'],
		})
	}
}

function updateVisitSource() {
	const src = map?.getSource(SRC.visits) as maplibregl.GeoJSONSource | undefined
	src?.setData(buildVisitsFC())
}

function updateRouteSource() {
	const src = map?.getSource(SRC.route) as maplibregl.GeoJSONSource | undefined
	src?.setData(props.showRoute ? (buildRouteFC() ?? emptyFC()) : emptyFC())
}

function updateSelSource() {
	const src = map?.getSource(SRC.sel) as maplibregl.GeoJSONSource | undefined
	src?.setData(buildSelFC())
}

function fitBounds() {
	if (!map) return
	const coords = props.visits
		.map((v) => toCoord(v))
		.filter((c): c is [number, number] => c !== null)

	if (coords.length === 0) return
	if (coords.length === 1) {
		map.setCenter(coords[0])
		map.setZoom(14)
		return
	}

	const bounds = coords.reduce(
		(b, c) => b.extend(c),
		new maplibregl.LngLatBounds(coords[0], coords[0]),
	)
	map.fitBounds(bounds, { padding: 60 })
}

// --- Lifecycle ---
onMounted(() => {
	const container = mapContainer.value
	if (!container) return

	const currentMap = new maplibregl.Map({
		container,
		style: styleUrl('basic-preview'),
		center: [11.68, 56.25],
		zoom: 6,
	})

	window.addEventListener('mouseup', () => {
		if (map) (map as any).stop()
	})

	map = currentMap

	map.on('error', ({ error }) => {
		console.error('MapLibre error:', error)
	})

	map.on('load', () => {
		addBaseLayers()

		map!.on('click', LAYER.visits, (e) => {
			const id = e.features?.[0]?.properties?.id
			if (id == null) return

			if (props.mode === 'group' && activeTool.value === 'pointer') {
				toggleSelection(Number(id))
			}
			emit('visit-click', Number(id))
		})

		map!.on('mouseenter', LAYER.visits, () => {
			if (map) map.getCanvas().style.cursor = 'pointer'
		})
		map!.on('mouseleave', LAYER.visits, () => {
			if (map && activeTool.value !== 'select' && !isDrawing.value) {
				map.getCanvas().style.cursor = ''
			}
		})

		map!.on('click', (e) => {
			if (activeTool.value === 'select') handleMapClick(e)
		})

		map!.on('dblclick', (e) => {
			if (activeTool.value === 'select' && isDrawing.value) {
				e.originalEvent.preventDefault()
				runSelection()
			}
		})

		if (props.visits.length > 0) {
			fitBounds()
		}
	})

	document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
	document.removeEventListener('keydown', handleKeydown)
	map?.remove()
	map = null
})

watch(
	() => props.visits,
	() => {
		if (!map?.isStyleLoaded()) return
		updateVisitSource()
		updateRouteSource()
		if (props.showRoute) fitBounds()
	},
	{ deep: true },
)

watch(
	() => props.showRoute,
	() => {
		if (map?.isStyleLoaded()) addBaseLayers()
	},
)

watch(
	() => props.mode,
	() => {
		if (map?.isStyleLoaded()) addBaseLayers()
	},
)
</script>

<style scoped>
.map-wrapper {
	position: relative;
	width: 100%;
}

.map-container {
	width: 100%;
	height: 500px;
	border-radius: 0.375rem;
}

.map-toolbar {
	position: absolute;
	top: 10px;
	left: 10px;
	z-index: 10;
	display: flex;
	gap: 4px;
	background: white;
	padding: 4px;
	border-radius: 6px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.map-toolbar button {
	width: 34px;
	height: 34px;
	border: 1px solid #d1d5db;
	background: white;
	border-radius: 4px;
	cursor: pointer;
	font-size: 16px;
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.map-toolbar button:hover {
	background: #f3f4f6;
}

.map-toolbar button.active {
	background: #6366f1;
	color: white;
	border-color: #6366f1;
}

.map-toolbar .btn-done,
.map-toolbar .btn-cancel {
	width: auto;
	padding: 0 10px;
	font-size: 13px;
}

.map-toolbar .btn-done {
	background: #10b981;
	color: white;
	border-color: #10b981;
}

.map-toolbar .btn-cancel {
	background: #ef4444;
	color: white;
	border-color: #ef4444;
}

.selection-info {
	position: absolute;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 10;
	background: white;
	padding: 8px 16px;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	font-size: 14px;
	display: flex;
	gap: 12px;
	align-items: center;
}

.btn-clear {
	border: 1px solid #d1d5db;
	background: white;
	padding: 4px 10px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 13px;
}

.btn-clear:hover {
	background: #f3f4f6;
}
</style>
