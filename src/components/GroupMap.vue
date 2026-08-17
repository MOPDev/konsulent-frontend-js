<template>
	<div class="map-wrapper">
		<div ref="mapContainer" class="map-container" @contextmenu.prevent></div>

		<div class="map-toolbar">
			<button
				:class="{ active: activeTool === 'pointer' }"
				title="Vælg"
				@click="setTool('pointer')"
			>
				↖
			</button>
			<button
				:class="{ active: activeTool === 'select' }"
				title="Tegn polygon"
				@click="setTool('select')"
			>
				◇
			</button>
			<button v-if="isDrawing" class="btn-done" @click="finishDrawing">✓ Færdig</button>
			<button v-if="isDrawing" class="btn-cancel" @click="cancelDrawing">✗ Fortryd</button>
			<button v-if="hasPolygon && !isDrawing" class="btn-cancel" @click="cancelDrawing">
				✗ Fjern polygon
			</button>
		</div>

		<div v-if="selectedVisitIds.length" class="selection-bar">
			<span>{{ selectedVisitIds.length }} besøg valgt</span>
			<button class="btn-sm" @click="clearSelection">Fjern valg</button>
			<button class="btn-sm btn-primary" @click="emit('create-group', [...selectedVisitIds])">
				Opret gruppe
			</button>
			<select v-if="existingGroups.length" v-model="selectedGroupId" class="group-select">
				<option :value="null" disabled>Tilføj til eksisterende gruppe...</option>
				<option v-for="g in existingGroups" :key="g.group_id" :value="g.group_id">
					Gruppe {{ g.group_id }} ({{ g.visit_date }})
				</option>
			</select>
			<button v-if="selectedGroupId" class="btn-sm btn-primary" @click="addToGroup">
				Tilføj
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { styleUrl, geocode } from '@/api/maptiler'

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
		showRoute?: boolean
		center?: [number, number]
		zoom?: number
		modelValue?: number[]
		existingGroups?: { group_id: number; visit_date: string }[]
		ambiguousIds?: number[]
	}>(),
	{
		showRoute: false,
		center: () => [11.68, 56.25],
		zoom: 6,
		modelValue: () => [],
		existingGroups: () => [],
		ambiguousIds: () => [],
	},
)

const emit = defineEmits<{
	'visit-click': [id: number]
	'selection-changed': [ids: number[]]
	'update:modelValue': [ids: number[]]
	'create-group': [visitIds: number[]]
	'add-to-group': [groupId: number, visitIds: number[]]
	'address-corrected': [visitId: number, lat: number, lng: number, address: string]
}>()

const mapContainer = ref<HTMLElement>()
let map: maplibregl.Map | null = null

const activeTool = ref<'pointer' | 'select'>('pointer')
const isDrawing = ref(false)
const drawVertices = ref<[number, number][]>([])
const selectedVisitIds = ref<number[]>([...props.modelValue])
const selectedGroupId = ref<number | null>(null)

const hasPolygon = computed(() => drawVertices.value.length >= 3)

// --- Geocoding ---
let geoPopup: maplibregl.Popup | null = null
let correctingVisitId: number | null = null
let geoListEl: HTMLElement | null = null
let geoDebounce: ReturnType<typeof setTimeout> | null = null

function renderGeoResults(results: { lat: number; lng: number; label: string }[], query: string) {
	if (!geoListEl) return
	geoListEl.innerHTML = ''
	if (results.length === 0) {
		geoListEl.textContent = query ? 'Ingen resultater' : ''
		return
	}
	results.forEach((r) => {
		const item = document.createElement('div')
		item.className = 'geo-result'
		item.textContent = r.label
		item.addEventListener('click', () => {
			emit('address-corrected', correctingVisitId!, r.lat, r.lng, r.label)
			closeGeoPopup()
		})
		geoListEl!.appendChild(item)
	})
}

function openGeoPopup(visitId: number, lng: number, lat: number) {
	if (!map) return
	correctingVisitId = visitId
	closeGeoPopup()

	const container = document.createElement('div')
	container.className = 'geo-popup'

	const input = document.createElement('input')
	input.type = 'text'
	input.placeholder = 'Søg efter adresse...'
	input.className = 'geo-input'
	input.addEventListener('input', () => {
		if (geoDebounce) clearTimeout(geoDebounce)
		geoDebounce = setTimeout(() => {
			const q = input.value
			if (!q.trim()) {
				renderGeoResults([], '')
				return
			}
			geocode(q)
				.then((res) => {
					const results = (res.features || []).map((f: any) => ({
						lat: f.geometry?.coordinates?.[1] ?? 0,
						lng: f.geometry?.coordinates?.[0] ?? 0,
						label: f.properties?.name
							? [f.properties.name, f.properties.street, f.properties.city]
									.filter(Boolean)
									.join(', ')
							: f.properties?.street
								? [f.properties.street, f.properties.city]
										.filter(Boolean)
										.join(', ')
								: [f.properties?.city, f.properties?.country]
										.filter(Boolean)
										.join(', ') || q,
					}))
					geoList = results
					geoQuery = q
					renderGeoResults(results, q)
				})
				.catch(() => renderGeoResults([], q))
		}, 300)
	})
	container.appendChild(input)

	const list = document.createElement('div')
	list.className = 'geo-results'
	container.appendChild(list)
	geoListEl = list

	geoPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '320px' })
		.setLngLat([lng, lat])
		.setDOMContent(container)
		.addTo(map)

	geoPopup.on('close', () => {
		correctingVisitId = null
		geoListEl = null
		if (geoDebounce) clearTimeout(geoDebounce)
	})
}

function closeGeoPopup() {
	geoPopup?.remove()
	geoPopup = null
	correctingVisitId = null
	geoListEl = null
	if (geoDebounce) clearTimeout(geoDebounce)
}

// hoisted for closure — no reactive needed, popup DOM is imperative
let geoList: { lat: number; lng: number; label: string }[] = []
let geoQuery = ''

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

watch(selectedVisitIds, (ids, oldIds) => {
	const same = ids.length === oldIds.length && ids.every((v, i) => v === oldIds[i])
	if (same) return
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
		if (map?.isStyleLoaded()) updateSelSource()
	},
)

function setTool(tool: 'pointer' | 'select') {
	if (isDrawing.value || hasPolygon.value) cancelDrawing()
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
	selectedGroupId.value = null
	cancelDrawing()
}

function toggleSelection(id: number) {
	const idx = selectedVisitIds.value.indexOf(id)
	if (idx === -1) selectedVisitIds.value = [...selectedVisitIds.value, id]
	else selectedVisitIds.value = selectedVisitIds.value.filter((v) => v !== id)
}

function addToGroup() {
	if (selectedGroupId.value == null) return
	emit('add-to-group', selectedGroupId.value, [...selectedVisitIds.value])
}

// --- GeoJSON ---

function toCoord(v: MapVisit): [number, number] | null {
	const lat = Number(v.latitude)
	const lng = Number(v.longitude)
	if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null
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
				properties: { id: v.ID, stop_nr: v.stop_nr, group_id: v.group_id },
			}
		})
		.filter(Boolean) as GeoJSON.Feature[]
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
				geometry: { type: 'LineString', coordinates: sorted.map((x) => x.c) },
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
				properties: { id: v.ID },
			}
		})
		.filter(Boolean) as GeoJSON.Feature[]
	return { type: 'FeatureCollection', features }
}

const SNAP_DEG = 0.002 // ~200m at DK latitude — snap threshold

function findSnapTarget(pt: [number, number]): [number, number] | null {
	let best: [number, number] | null = null
	let bestDist = SNAP_DEG
	for (const v of props.visits) {
		const c = toCoord(v)
		if (!c) continue
		const d = Math.sqrt((pt[0] - c[0]) ** 2 + (pt[1] - c[1]) ** 2)
		if (d < bestDist) {
			bestDist = d
			best = c
		}
	}
	return best
}

function buildDrawFC(): GeoJSON.FeatureCollection {
	const verts = drawVertices.value
	const features: GeoJSON.Feature[] = []
	if (verts.length >= 3 && !isDrawing.value) {
		features.push({
			type: 'Feature',
			geometry: { type: 'Polygon', coordinates: [[...verts, verts[0]]] },
			properties: {},
		})
	} else if (verts.length >= 2) {
		features.push({
			type: 'Feature',
			geometry: { type: 'LineString', coordinates: verts },
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

// --- Point in polygon ---

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

watch(isDrawing, () => {
	if (!map?.isStyleLoaded()) return
	if (!map.getLayer(LAYER.drawFill)) return
	map.setPaintProperty(LAYER.drawFill, 'fill-color', isDrawing.value ? '#6366f1' : '#9ca3af')
	map.setPaintProperty(LAYER.drawFill, 'fill-opacity', isDrawing.value ? 0.15 : 0.35)
})

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
	isDrawing.value = false
	updateDrawSource()
	updateCursor()
}

function handleMapClick(e: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }) {
	if (activeTool.value !== 'select') return
	if (hasPolygon.value && !isDrawing.value) {
		cancelDrawing()
	}
	const raw: [number, number] = [e.lngLat.lng, e.lngLat.lat]
	const snapped = findSnapTarget(raw) ?? raw
	if (!isDrawing.value) {
		isDrawing.value = true
		drawVertices.value = [snapped]
		updateDrawSource()
		updateCursor()
		return
	}
	const first = drawVertices.value[0]
	if (
		drawVertices.value.length >= 3 &&
		Math.sqrt((snapped[0] - first[0]) ** 2 + (snapped[1] - first[1]) ** 2) < SNAP_DEG
	) {
		runSelection()
		return
	}
	drawVertices.value = [...drawVertices.value, snapped]
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

// --- Map layers ---

function emptyFC(): GeoJSON.FeatureCollection {
	return { type: 'FeatureCollection', features: [] }
}

function ensureSource(id: string, data: GeoJSON.FeatureCollection) {
	if (!map) return
	if (map.getSource(id)) {
		;(map.getSource(id) as maplibregl.GeoJSONSource).setData(data)
	} else {
		map.addSource(id, { type: 'geojson', data })
	}
}

function ensureLayer(id: string, spec: Record<string, unknown>) {
	if (!map || map.getLayer(id)) return
	map.addLayer({ id, ...spec } as any)
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
			'circle-color': ['case', ['boolean', ['get', 'group_id'], false], '#10b981', '#3b82f6'],
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

function updateSelSource() {
	const src = map?.getSource(SRC.sel) as maplibregl.GeoJSONSource | undefined
	src?.setData(buildSelFC())
}

// --- Lifecycle ---

onMounted(() => {
	const container = mapContainer.value
	if (!container) return

	map = new maplibregl.Map({
		container,
		style: styleUrl('basic-preview'),
		center: props.center,
		zoom: props.zoom,
	})

	map.on('load', () => {
		addBaseLayers()

		map!.on('click', LAYER.visits, (e) => {
			const id = e.features?.[0]?.properties?.id
			if (id == null) return
			if (activeTool.value === 'pointer' && props.ambiguousIds.includes(Number(id))) {
				const coords = (e.features?.[0]?.geometry as any)?.coordinates
				if (coords) openGeoPopup(Number(id), coords[0], coords[1])
				return
			}
			if (activeTool.value === 'pointer') toggleSelection(Number(id))
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
		const src = map.getSource(SRC.visits) as maplibregl.GeoJSONSource | undefined
		src?.setData(buildVisitsFC())
	},
	{ deep: true },
)

function setSelectedIds(ids: number[]) {
	selectedVisitIds.value = ids
	if (map?.isStyleLoaded()) updateSelSource()
}

defineExpose({ clearSelection, setSelectedIds })
</script>

<style scoped>
.map-wrapper {
	position: relative;
	width: 100%;
	height: 100%; /* fill parent instead of fixed 500px */
}
.map-container {
	width: 100%;
	height: 100%;
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

.selection-bar {
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
	gap: 8px;
	align-items: center;
	flex-wrap: wrap;
	justify-content: center;
}
.btn-sm {
	border: 1px solid #d1d5db;
	background: white;
	padding: 4px 10px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 13px;
}
.btn-sm:hover {
	background: #f3f4f6;
}
.btn-primary {
	background: #6366f1;
	color: white;
	border-color: #6366f1;
}
.btn-primary:hover {
	background: #5558e6;
}
.group-select {
	font-size: 13px;
	padding: 3px 6px;
	border: 1px solid #d1d5db;
	border-radius: 4px;
}

:deep(.geo-popup) {
	padding: 8px;
}
:deep(.geo-input) {
	width: 100%;
	padding: 6px 8px;
	border: 1px solid #d1d5db;
	border-radius: 4px;
	font-size: 14px;
	box-sizing: border-box;
}
:deep(.geo-results) {
	margin-top: 6px;
	max-height: 180px;
	overflow-y: auto;
	font-size: 13px;
	color: #374151;
}
:deep(.geo-result) {
	padding: 6px 8px;
	cursor: pointer;
	border-radius: 3px;
}
:deep(.geo-result:hover) {
	background: #f3f4f6;
}
</style>
