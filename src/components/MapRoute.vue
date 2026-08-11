<template>
	<div class="mr-layout">
		<div class="mr-list">
			<h3>Grupper</h3>
			<div v-if="error" class="mr-error">{{ error }}</div>
			<div v-for="group in groups" :key="group.key" class="mr-group">
				<div
					class="mr-group-header"
					:class="{ active: selectedGroup?.key === group.key }"
					@click="selectGroup(group)"
				>
					<span class="mr-group-title">
						{{ group.visits[0]?.konsulentName || 'Ikke tildelt konsulent' }} —
						{{ group.visits.length }} besøg
					</span>
					<span class="mr-group-date">{{ formatDate(group.date) }}</span>
					<button
						v-if="selectedGroup?.key === group.key"
						class="mr-optimize"
						:disabled="optimizing"
						title="Optimér ruten"
						@click.stop="optimizeGroup"
					>
						{{ optimizing ? '…' : 'Optimér' }}
					</button>
				</div>
				<div v-if="selectedGroup?.key === group.key" class="mr-visits">
					<div
						v-for="(visit, idx) in orderedVisits"
						:key="visit.ID"
						class="mr-visit"
						:class="{
							'seg-start': isSegmentStart(visit, idx),
							'seg-end': isSegmentEnd(visit, idx),
							locked: isLocked(visit),
						}"
					>
						<div class="mr-visit-info">
							<span class="mr-stopnr">{{ visit.stop_nr }}</span>
							<span class="mr-sagsnr">{{ visit.sagsnr }}</span>
							<span class="mr-addr">{{ visit.address }}</span>
							<span v-if="isSegmentStart(visit, idx)" class="badge badge-start"
								>START</span
							>
							<span v-if="isSegmentEnd(visit, idx)" class="badge badge-end"
								>SLUT</span
							>
							<span v-if="isLocked(visit)" class="badge badge-locked">LÅST</span>
						</div>
						<div class="mr-visit-actions">
							<button
								:disabled="idx === 0"
								title="Flyt op"
								@click="moveUp(visit, idx)"
							>
								↑
							</button>
							<button
								:disabled="idx === orderedVisits.length - 1"
								title="Flyt ned"
								@click="moveDown(visit, idx)"
							>
								↓
							</button>
							<button
								v-if="!isSegmentStart(visit, idx)"
								title="Start nyt segment her"
								@click="splitSegment(visit, idx)"
							>
								‖
							</button>
							<button
								v-if="isSegmentStart(visit, idx) && idx > 0"
								title="Flet med forrige segment"
								@click="joinSegment(visit, idx)"
							>
								⏶
							</button>
						</div>
					</div>
				</div>
			</div>
			<div v-if="!groups.length" class="mr-empty">Ingen grupper fundet</div>
		</div>
		<div class="mr-map">
			<div ref="mapContainer" class="map-container"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { styleUrl } from '@/api/maptiler'
import { visitsApi } from '@/api/visits'
import { usersApi } from '@/api/users'
import { errorApi } from '@/utils/axios'
import { decodePolyline } from '@/utils/polyline'

interface VisitData {
	ID: number
	sagsnr: number
	address: string
	latitude: string | number
	longitude: string | number
	visit_date: string
	visit_time?: string
	stop_nr: number
	segment_index: number | null
	group_id?: number | null
	user_id?: number
	konsulentName?: string
	debitors: Array<{ ID: number; name: string }>
	type: { text: string }
	[key: string]: unknown
}

interface VisitGroup {
	key: string
	visits: VisitData[]
	date: string | null
}

const mapContainer = ref<HTMLElement>()
let map: maplibregl.Map | null = null
let updating = false

const groups = ref<VisitGroup[]>([])
const selectedGroup = ref<VisitGroup | null>(null)
const error = ref<string | null>(null)
const optimizing = ref(false)
const optimizedLegs = ref<[number, number][][]>([])

const SRC = { route: 'route-src', points: 'points-src', optimized: 'optimized-src' }
const LAYER = {
	route: 'route-layer',
	points: 'points-layer',
	pointsLabel: 'points-label-layer',
	segRoute: 'seg-route-layer',
	optimized: 'optimized-layer',
}

const SEGMENT_COLORS = [
	'#6366f1',
	'#10b981',
	'#f59e0b',
	'#ef4444',
	'#8b5cf6',
	'#ec4899',
	'#06b6d4',
	'#84cc16',
]

const orderedVisits = computed(() => {
	if (!selectedGroup.value) return []
	return [...selectedGroup.value.visits].sort((a, b) => a.stop_nr - b.stop_nr)
})

function isSegmentStart(visit: VisitData, idx: number): boolean {
	if (idx === 0) return true
	const prev = orderedVisits.value[idx - 1]
	return prev.segment_index !== visit.segment_index
}

function isSegmentEnd(visit: VisitData, idx: number): boolean {
	if (idx === orderedVisits.value.length - 1) return true
	const next = orderedVisits.value[idx + 1]
	return next.segment_index !== visit.segment_index
}

function isLocked(visit: VisitData): boolean {
	return (
		visit.segment_index !== null &&
		orderedVisits.value.filter((v) => v.segment_index === visit.segment_index).length === 1
	)
}

function segColor(visit: VisitData): string {
	if (visit.segment_index === null) return SEGMENT_COLORS[0]
	return SEGMENT_COLORS[visit.segment_index % SEGMENT_COLORS.length]
}

function selectGroup(group: VisitGroup) {
	selectedGroup.value = group
	optimizedLegs.value = []
	updateMap()
}

function formatDate(date: string | null | undefined): string {
	if (!date) return ''
	const d = new Date(date)
	if (isNaN(d.getTime())) return ''
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

function toCoord(v: VisitData): [number, number] | null {
	const lat = Number(v.latitude)
	const lng = Number(v.longitude)
	if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null
	return [lng, lat]
}

async function moveUp(visit: VisitData, idx: number) {
	if (idx === 0 || updating) return
	updating = true
	try {
		await visitsApi.reorderVisit(Number(selectedGroup.value!.key), visit.ID, 'up')
		await refresh()
	} catch (err: any) {
		error.value = 'Fejl ved omordning'
		errorApi.logError(err)
	} finally {
		updating = false
	}
}

async function moveDown(visit: VisitData, idx: number) {
	if (idx === orderedVisits.value.length - 1 || updating) return
	updating = true
	try {
		await visitsApi.reorderVisit(Number(selectedGroup.value!.key), visit.ID, 'down')
		await refresh()
	} catch (err: any) {
		error.value = 'Fejl ved omordning'
		errorApi.logError(err)
	} finally {
		updating = false
	}
}

async function splitSegment(visit: VisitData, idx: number) {
	if (updating || !selectedGroup.value) return
	updating = true
	try {
		await visitsApi.splitSegment(Number(selectedGroup.value.key), visit.ID)
		await refresh()
	} catch (err: any) {
		error.value = 'Fejl ved opdeling af segment'
		errorApi.logError(err)
	} finally {
		updating = false
	}
}

async function joinSegment(visit: VisitData, idx: number) {
	if (updating || !selectedGroup.value) return
	updating = true
	try {
		await visitsApi.joinSegment(Number(selectedGroup.value.key), visit.ID)
		await refresh()
	} catch (err: any) {
		error.value = 'Fejl ved sammenlægning af segment'
		errorApi.logError(err)
	} finally {
		updating = false
	}
}

async function optimizeGroup() {
	if (updating || optimizing.value || !selectedGroup.value) return
	optimizing.value = true
	error.value = null
	try {
		const res = await visitsApi.optimizeGroup(Number(selectedGroup.value.key), {
			costing: 'auto',
			mode: 'time',
		})
		await refresh()
		optimizedLegs.value = res.geometry.map((g) => decodePolyline(g))
		updateMap()
	} catch (err: any) {
		optimizedLegs.value = []
		error.value = 'Optimering fejlede'
		errorApi.logError(err)
		updateMap()
	} finally {
		optimizing.value = false
	}
}

async function refresh() {
	if (!selectedGroup.value) return
	optimizedLegs.value = []
	const all = await visitsApi.getPlanned()
	const flat: VisitData[] = (all || []).flatMap((k: any) =>
		(k.visits || []).map((v: any) => ({
			...v,
			konsulentName: k.name,
		})),
	)
	const groupVisits = flat.filter((v) => String(v.group_id) === selectedGroup.value!.key)
	selectedGroup.value.visits = groupVisits
	groups.value = buildGroups(flat)
	updateMap()
}

function buildGroups(visits: VisitData[]): VisitGroup[] {
	const map: Record<string, VisitGroup> = {}
	for (const v of visits) {
		if (!v.group_id) continue
		const key = String(v.group_id)
		if (!map[key]) map[key] = { key, visits: [], date: null }
		map[key].visits.push(v)
	}
	return Object.values(map)
		.map((g) => {
			g.visits.sort((a, b) => a.stop_nr - b.stop_nr)
			g.date = g.visits[0]?.visit_date ?? null
			return g
		})
		.sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
}

function buildRouteFC(): GeoJSON.FeatureCollection {
	const list = orderedVisits.value
	const coords = list.map((v) => toCoord(v)).filter(Boolean) as [number, number][]
	const features: GeoJSON.Feature[] = []

	// One LineString per segment
	let segStart = 0
	for (let i = 0; i <= list.length; i++) {
		if (i === list.length || (i > 0 && list[i].segment_index !== list[i - 1].segment_index)) {
			const segCoords = coords.slice(segStart, i + 1)
			if (segCoords.length >= 2) {
				features.push({
					type: 'Feature',
					geometry: { type: 'LineString', coordinates: segCoords },
					properties: { segment: list[segStart].segment_index ?? 0 },
				})
			}
			segStart = i
		}
	}

	// Points
	list.forEach((v) => {
		const c = toCoord(v)
		if (!c) return
		features.push({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: c },
			properties: { id: v.ID, label: String(v.stop_nr), segment: v.segment_index ?? 0 },
		})
	})

	return { type: 'FeatureCollection', features }
}

function emptyFC(): GeoJSON.FeatureCollection {
	return { type: 'FeatureCollection', features: [] }
}

function buildOptimizedFC(): GeoJSON.FeatureCollection {
	const features: GeoJSON.Feature[] = optimizedLegs.value
		.filter((leg) => leg.length >= 2)
		.map((leg) => ({
			type: 'Feature',
			geometry: {
				type: 'LineString',
				coordinates: leg.map(([lat, lon]): [number, number] => [lon, lat]),
			},
			properties: {},
		}))
	return { type: 'FeatureCollection', features }
}

function updateMap() {
	// isStyleLoaded() is false during camera transitions (fitBounds), so guard
	// on the layers we created instead
	if (!map || !selectedGroup.value || !map.getLayer(LAYER.route)) return
	const fc = buildRouteFC()
	const src = map.getSource(SRC.route) as maplibregl.GeoJSONSource | undefined
	src?.setData(optimizedLegs.value.length ? emptyFC() : fc)

	const ptsSrc = map.getSource(SRC.points) as maplibregl.GeoJSONSource | undefined
	ptsSrc?.setData(fc)

	const optSrc = map.getSource(SRC.optimized) as maplibregl.GeoJSONSource | undefined
	optSrc?.setData(buildOptimizedFC())

	// Fit bounds
	const coords = orderedVisits.value.map((v) => toCoord(v)).filter(Boolean) as [number, number][]
	if (coords.length > 0) {
		const bounds = coords.reduce(
			(b, c) => b.extend(c),
			new maplibregl.LngLatBounds(coords[0], coords[0]),
		)
		map.fitBounds(bounds, { padding: 60, maxZoom: 14 })
	}
}

function addBaseLayers() {
	if (!map || !map.isStyleLoaded()) return

	// Route layer (per segment color)
	ensureSource(SRC.route, emptyFC())

	// Use a match expression for segment colors
	const colors = SEGMENT_COLORS.map((c, i) => [i, c]).flat()
	ensureLayer(LAYER.route, {
		type: 'line',
		source: SRC.route,
		paint: {
			'line-color': ['match', ['get', 'segment'], ...colors, '#6366f1'],
			'line-width': 4,
			'line-opacity': 0.8,
		},
		filter: ['==', '$type', 'LineString'],
	})

	ensureSource(SRC.optimized, emptyFC())
	ensureLayer(LAYER.optimized, {
		type: 'line',
		source: SRC.optimized,
		paint: {
			'line-color': '#2563eb',
			'line-width': 4,
			'line-opacity': 0.9,
		},
		filter: ['==', '$type', 'LineString'],
	})

	ensureSource(SRC.points, emptyFC())
	ensureLayer(LAYER.points, {
		type: 'circle',
		source: SRC.points,
		paint: {
			'circle-radius': 8,
			'circle-color': ['match', ['get', 'segment'], ...colors, '#6366f1'],
			'circle-stroke-color': '#ffffff',
			'circle-stroke-width': 2,
		},
		filter: ['==', '$type', 'Point'],
	})
	ensureLayer(LAYER.pointsLabel, {
		type: 'symbol',
		source: SRC.points,
		layout: {
			'text-field': ['get', 'label'],
			'text-size': 11,
			'text-anchor': 'center',
			'text-allow-overlap': true,
		},
		paint: {
			'text-color': '#ffffff',
			'text-halo-color': '#1f2937',
			'text-halo-width': 1.5,
		},
		filter: ['==', '$type', 'Point'],
	})
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

onMounted(async () => {
	try {
		const all = await visitsApi.getPlanned()
		const flat: VisitData[] = (all || []).flatMap((k: any) =>
			(k.visits || []).map((v: any) => ({
				...v,
				konsulentName: k.name,
			})),
		)
		groups.value = buildGroups(flat)
		error.value = null
	} catch (err: any) {
		error.value = 'Fejl ved hentning af grupper'
		errorApi.logError(err)
	}

	const container = mapContainer.value
	if (!container) return

	map = new maplibregl.Map({
		container,
		style: styleUrl('basic-preview'),
		center: [11.68, 56.25],
		zoom: 6,
	})

	map.on('load', () => {
		addBaseLayers()
		if (selectedGroup.value) updateMap()
	})
})

onBeforeUnmount(() => {
	map?.remove()
	map = null
})
</script>

<style scoped>
.mr-layout {
	display: flex;
	gap: 16px;
	height: 75vh;
	align-items: flex-start;
}
.mr-list {
	flex: 0 0 480px;
	max-height: 100%;
	overflow-y: auto;
	border: 1px solid #e5e7eb;
	border-radius: 6px;
	padding: 12px;
	background: #f9fafb;
}
.mr-map {
	flex: 1;
	min-height: 500px;
	height: 100%;
}
.map-container {
	width: 100%;
	height: 100%;
	border-radius: 6px;
}
.mr-group {
	margin-bottom: 8px;
}
.mr-group-header {
	padding: 8px 10px;
	background: white;
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	cursor: pointer;
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 14px;
	transition: background 0.15s;
}
.mr-group-header:hover,
.mr-group-header.active {
	background: #eef2ff;
	border-color: #6366f1;
}
.mr-optimize {
	flex-shrink: 0;
	margin-left: 8px;
	padding: 2px 10px;
	font-size: 12px;
	font-weight: 600;
	color: #1d4ed8;
	background: #dbeafe;
	border: 1px solid #93c5fd;
	border-radius: 4px;
	cursor: pointer;
}
.mr-optimize:hover:not(:disabled) {
	background: #bfdbfe;
}
.mr-optimize:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
.mr-group-title {
	font-weight: 600;
	color: #374151;
}
.mr-group-date {
	color: #6b7280;
	font-size: 13px;
}
.mr-visits {
	margin-top: 4px;
	margin-left: 8px;
	border-left: 3px solid #6366f1;
}
.mr-visit {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 6px 8px;
	font-size: 13px;
	border-bottom: 1px solid #f3f4f6;
	background: white;
	transition: background 0.1s;
}
.mr-visit:hover {
	background: #f9fafb;
}
.mr-visit.seg-start {
	border-top: 2px solid #6366f1;
}
.mr-visit.seg-end {
	border-bottom: 2px solid #6366f1;
}
.mr-visit.locked {
	background: #fffbeb;
}
.mr-visit-info {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
}
.mr-stopnr {
	font-weight: 700;
	color: #6366f1;
	min-width: 24px;
}
.mr-sagsnr {
	color: #374151;
	font-weight: 500;
}
.mr-addr {
	color: #6b7280;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.mr-visit-actions {
	display: flex;
	gap: 2px;
	flex-shrink: 0;
}
.mr-visit-actions button {
	width: 24px;
	height: 24px;
	border: 1px solid #d1d5db;
	background: white;
	border-radius: 3px;
	cursor: pointer;
	font-size: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
}
.mr-visit-actions button:hover:not(:disabled) {
	background: #f3f4f6;
	border-color: #6366f1;
}
.mr-visit-actions button:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}
.badge {
	font-size: 10px;
	padding: 1px 5px;
	border-radius: 3px;
	font-weight: 600;
}
.badge-start {
	background: #dbeafe;
	color: #1d4ed8;
}
.badge-end {
	background: #fef3c7;
	color: #d97706;
}
.badge-locked {
	background: #fce7f3;
	color: #be185d;
}
.mr-empty {
	color: #9ca3af;
	text-align: center;
	padding: 40px;
	font-size: 14px;
}
.mr-error {
	margin-bottom: 8px;
	padding: 6px 10px;
	font-size: 13px;
	color: #b91c1c;
	background: #fee2e2;
	border: 1px solid #fecaca;
	border-radius: 4px;
}
h3 {
	margin: 0 0 12px 0;
	font-size: 16px;
	color: #374151;
}
</style>
