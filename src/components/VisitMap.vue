//VisitMap.vue
<template>
	<div class="map-wrapper">
		<div ref="mapContainer" class="map-container" @contextmenu.prevent></div>

		<div v-if="mode === 'group'" class="map-toolbar">
			<button
				:class="{ active: activeTool === 'pointer' }"
				:title="activeTool === 'select' ? `Afslut polygon (Enter)` : ''"
				@click="setTool('pointer')"
			>
				↖
			</button>
			<button
				:class="{ active: activeTool === 'select' }"
				:title="activeTool === 'select' ? `Tegn polygon for at vælge` : ''"
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
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { styleUrl } from '@/api/maptiler'

interface MapVisit {
	ID: number
	latitude: string | number
	longitude: string | number
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

// --- Map lifecycle ---

const mapContainer = ref<HTMLElement>()
let map: maplibregl.Map | null = null

const visitsSourceId = 'visits-source'
const visitsLayerId = 'visits-layer'
const selectedLayerId = 'visits-selected-layer'
const routeSourceId = 'route-source'
const routeLayerId = 'route-layer'
const drawSourceId = 'draw-source'
const drawFillLayerId = 'draw-fill'
const drawOutlineLayerId = 'draw-outline'
const drawVerticesLayerId = 'draw-vertices'

// --- Selection state ---

const activeTool = ref<'pointer' | 'select'>('pointer')
const isDrawing = ref(false)
const drawVertices = ref<[number, number][]>([])

const selectedVisitIds = ref<number[]>([...props.modelValue])

watch(selectedVisitIds, (ids) => {
	emit('selection-changed', ids)
	emit('update:modelValue', ids)
	updateSelectionLayer()
})

watch(
	() => props.modelValue,
	(ids) => {
		selectedVisitIds.value = [...ids]
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

// --- Drawing ---

function addDrawLayers() {
	if (!map) return

	const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

	if (!map.getSource(drawSourceId)) {
		map.addSource(drawSourceId, { type: 'geojson', data: empty })

		map.addLayer({
			id: drawFillLayerId,
			type: 'fill',
			source: drawSourceId,
			paint: {
				'fill-color': '#6366f1',
				'fill-opacity': 0.15,
			},
		})
		map.addLayer({
			id: drawOutlineLayerId,
			type: 'line',
			source: drawSourceId,
			paint: {
				'line-color': '#6366f1',
				'line-width': 2,
				'line-dasharray': [3, 2],
			},
		})
		map.addLayer({
			id: drawVerticesLayerId,
			type: 'circle',
			source: drawSourceId,
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

function updateDrawSource() {
	if (!map) return
	const src = map.getSource(drawSourceId) as maplibregl.GeoJSONSource | undefined
	if (!src) return

	const verts = drawVertices.value
	const features: GeoJSON.Feature[] = []

	if (verts.length >= 2) {
		if (isDrawing.value) {
			features.push({
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: verts },
				properties: {},
			})
		} else {
			features.push({
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [[...verts, verts[0]]] },
				properties: {},
			})
		}
	}

	verts.forEach((v) => {
		features.push({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: v },
			properties: {},
		})
	})

	src.setData({ type: 'FeatureCollection', features })
}

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
	let inside = false
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i][0],
			yi = polygon[i][1]
		const xj = polygon[j][0],
			yj = polygon[j][1]
		if (
			yi > point[1] !== yj > point[1] &&
			point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
		) {
			inside = !inside
		}
	}
	return inside
}

function runSelection() {
	const verts = drawVertices.value
	if (verts.length < 3) return

	const selected = props.visits
		.filter((v) => {
			const pt: [number, number] = [Number(v.longitude), Number(v.latitude)]
			return pointInPolygon(pt, verts)
		})
		.map((v) => v.ID)

	const existing = new Set(selectedVisitIds.value)
	selected.forEach((id) => existing.add(id))
	selectedVisitIds.value = Array.from(existing)

	cancelDrawing()
}

function handleMapClick(e: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }) {
	if (activeTool.value !== 'select') return

	if (!isDrawing.value) {
		isDrawing.value = true
		drawVertices.value = [[e.lngLat.lng, e.lngLat.lat]]
		addDrawLayers()
		updateDrawSource()
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

function handleMapDblClick(e: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }) {
	if (activeTool.value !== 'select' || !isDrawing.value) return
	e.originalEvent.preventDefault()
	runSelection()
}

function finishDrawing() {
	if (drawVertices.value.length >= 2) runSelection()
}

function cancelDrawing() {
	isDrawing.value = false
	drawVertices.value = []
	if (map && map.getSource(drawSourceId)) {
		;(map.getSource(drawSourceId) as maplibregl.GeoJSONSource).setData({
			type: 'FeatureCollection',
			features: [],
		})
	}
}

// --- Selection layer ---

function updateSelectionLayer() {
	if (!map || !map.isStyleLoaded()) return

	const ids = selectedVisitIds.value
	const features = props.visits
		.filter((v) => ids.includes(v.ID) && v.latitude && v.longitude)
		.map((v) => ({
			type: 'Feature' as const,
			geometry: {
				type: 'Point' as const,
				coordinates: [Number(v.longitude), Number(v.latitude)],
			},
			properties: { id: v.ID },
		}))

	if (map.getSource('selected-source')) {
		;(map.getSource('selected-source') as maplibregl.GeoJSONSource).setData({
			type: 'FeatureCollection',
			features,
		})
		return
	}

	if (!features.length) return

	map.addSource('selected-source', {
		type: 'geojson',
		data: { type: 'FeatureCollection', features },
	})

	map.addLayer({
		id: selectedLayerId,
		type: 'circle',
		source: 'selected-source',
		paint: {
			'circle-radius': 10,
			'circle-color': '#f59e0b',
			'circle-stroke-color': '#ffffff',
			'circle-stroke-width': 3,
		},
	})
}

// --- Visit marker layer ---

function buildGeoJSON() {
	const features = props.visits
		.filter((v) => v.latitude && v.longitude)
		.map((v) => ({
			type: 'Feature' as const,
			geometry: {
				type: 'Point' as const,
				coordinates: [Number(v.longitude), Number(v.latitude)],
			},
			properties: {
				id: v.ID,
				stop_nr: v.stop_nr,
				segment_index: v.segment_index,
			},
		}))

	const sorted = [...props.visits]
		.filter((v) => v.latitude && v.longitude)
		.sort((a, b) => (a.stop_nr ?? 0) - (b.stop_nr ?? 0))

	const routeLine =
		sorted.length > 1
			? {
					type: 'Feature' as const,
					geometry: {
						type: 'LineString' as const,
						coordinates: sorted.map((v) => [Number(v.longitude), Number(v.latitude)]),
					},
					properties: {},
				}
			: null

	return { features, routeLine }
}

function addBaseLayers() {
	if (!map) return

	const { features, routeLine } = buildGeoJSON()

	if (map.getSource(visitsSourceId)) {
		;(map.getSource(visitsSourceId) as maplibregl.GeoJSONSource).setData({
			type: 'FeatureCollection',
			features,
		})
	} else {
		map.addSource(visitsSourceId, {
			type: 'geojson',
			data: { type: 'FeatureCollection', features },
		})

		map.addLayer({
			id: visitsLayerId,
			type: 'circle',
			source: visitsSourceId,
			paint: {
				'circle-radius': 8,
				'circle-color': '#3b82f6',
				'circle-stroke-color': '#ffffff',
				'circle-stroke-width': 2,
			},
		})

		map.on('click', visitsLayerId, (e) => {
			const id = e.features?.[0]?.properties?.id
			if (id == null) return

			if (props.mode === 'group' && activeTool.value === 'pointer') {
				toggleSelection(Number(id))
			}
			emit('visit-click', Number(id))
		})

		map.on('mouseenter', visitsLayerId, () => {
			if (map) map.getCanvas().style.cursor = 'pointer'
		})
		map.on('mouseleave', visitsLayerId, () => {
			if (map && activeTool.value !== 'select') map.getCanvas().style.cursor = ''
		})
	}

	if (props.showRoute && routeLine) {
		if (map.getSource(routeSourceId)) {
			;(map.getSource(routeSourceId) as maplibregl.GeoJSONSource).setData(routeLine as any)
		} else {
			map.addSource(routeSourceId, {
				type: 'geojson',
				data: routeLine as any,
			})

			map.addLayer({
				id: routeLayerId,
				type: 'line',
				source: routeSourceId,
				paint: {
					'line-color': '#6366f1',
					'line-width': 3,
					'line-opacity': 0.7,
					'line-dasharray': [2, 2],
				},
			})
		}
	} else if (map.getLayer(routeLayerId)) {
		map.removeLayer(routeLayerId)
		if (map.getSource(routeSourceId)) map.removeSource(routeSourceId)
	}

	updateSelectionLayer()
}

function toggleSelection(ID: number) {
	const idx = selectedVisitIds.value.indexOf(ID)
	if (idx === -1) {
		selectedVisitIds.value = [...selectedVisitIds.value, ID]
	} else {
		selectedVisitIds.value = selectedVisitIds.value.filter((v) => v !== ID)
	}
}

function fitBounds() {
	if (!map) return
	const coords = props.visits
		.filter((v) => v.latitude && v.longitude)
		.map((v) => [Number(v.longitude), Number(v.latitude)] as [number, number])

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
	if (!mapContainer.value) return

	map = new maplibregl.Map({
		container: mapContainer.value,
		style: styleUrl('streets'),
		center: props.center,
		zoom: props.zoom,
		...(props.maxBounds ? { maxBounds: props.maxBounds } : {}),
	})

	map.addControl(new maplibregl.NavigationControl(), 'top-right')

	map.on('load', () => {
		addBaseLayers()
		if (props.visits.length > 0) fitBounds()
	})

	map.on('click', handleMapClick)
	map.on('dblclick', handleMapDblClick)

	document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
	document.removeEventListener('keydown', handleKeydown)
	map?.remove()
	map = null
})

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		cancelDrawing()
	}
	if (e.key === 'Enter' && isDrawing.value) {
		finishDrawing()
	}
}

watch(
	() => props.visits,
	() => {
		if (map && map.isStyleLoaded()) addBaseLayers()
	},
	{ deep: true },
)

watch(
	() => props.showRoute,
	() => {
		if (map && map.isStyleLoaded()) addBaseLayers()
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
