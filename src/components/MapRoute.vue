<template>
	<div class="mr-layout">
		<div class="mr-side">
			<div class="mr-settings">
				<label class="mr-setting">
					Reference
					<select v-model="settings.anchor">
						<option value="start">Start</option>
						<option value="end">Slut</option>
					</select>
				</label>
				<label class="mr-setting">
					Start
					<input type="time" v-model="settings.start_time" />
				</label>
				<label class="mr-setting">
					Service
					<input type="number" v-model.number="settings.service_minutes" min="1" />
					min
				</label>
				<span
					style="cursor: help"
					class="mr-info-icon"
					title="Tryk på en af grupperne for at vise dens rute. Flere grupper kan vises samtidigt. 
Ved planlægning af besøg, så er det første besøg låst fast i ordenen. 
Sidste besøg kan låses ved at trykke på de 2 vertikale streger til venstre.
Besøg er opdelt i segmenter, hvor første besøg er låst fast i ordenen.
Segmenter oprettes ved at trykke på de 2 vertikale streger til venstre."
					>ⓘ</span
				>

				<label class="mr-setting">
					Slut
					<input type="time" v-model="settings.end_time" />
				</label>
				<button class="mr-save" :disabled="savingSettings" @click="saveSettings">
					{{ savingSettings ? '…' : 'Gem' }}
				</button>
				<span v-if="settingsSaved" class="mr-saved">Gemt</span>
			</div>
			<div class="mr-list">
				<div class="mr-list-head">
					<h3>Grupper</h3>
					<label
						class="mr-auto-toggle"
						title="Genberegn tider efter ændring af rækkefølge"
					>
						<input type="checkbox" v-model="autoRecompute" />
						Auto-opdater tider
					</label>
				</div>
				<div class="mr-hint">
					Klik på en gruppe for at vise ruten. Klik på flere for at sammenligne.
				</div>
				<div v-if="error" class="mr-error">{{ error }}</div>
				<div v-for="group in groups" :key="group.key" class="mr-group">
					<div
						class="mr-group-header"
						:class="{ active: isSelected(group.key) }"
						@click="toggleSelectGroup(group)"
					>
						<span class="mr-group-title">
							<span
								class="mr-group-dot"
								:style="{ background: groupColor(group.key) }"
							></span>
							{{ group.visits[0]?.konsulentName || 'Ikke tildelt konsulent' }} —
							{{ group.visits.length }} besøg
						</span>
						<span class="mr-group-date">{{ formatDate(group.date) }}</span>
						<span v-if="overrunMap[group.key]" class="mr-overrun">Over tid</span>
						<button
							v-if="isSelected(group.key)"
							class="mr-optimize"
							:disabled="optimizing"
							title="Optimér ruten"
							@click.stop="optimizeGroup(group)"
						>
							{{ optimizing ? '…' : 'Optimér' }}
						</button>
					</div>
					<div v-if="isSelected(group.key)" class="mr-visits">
						<div
							v-for="(visit, idx) in orderedVisits(group)"
							:key="visit.ID"
							class="mr-visit"
							:class="{
								'seg-start': isSegmentStart(group, visit, idx),
								'seg-end': isSegmentEnd(group, visit, idx),
								locked: isLocked(group, visit),
							}"
						>
							<div class="mr-visit-info">
								<span class="mr-stopnr">{{ visit.stop_nr }}</span>
								<span class="mr-time">{{ visit.visit_time || '–' }}</span>
								<span class="mr-sagsnr">{{ visit.sagsnr }}</span>
								<span class="mr-addr">{{ shortAddress(visit.address) }}</span>
								<span
									v-if="isSegmentStart(group, visit, idx)"
									class="badge badge-start"
									>START</span
								>
								<span v-if="isSegmentEnd(group, visit, idx)" class="badge badge-end"
									>SLUT</span
								>
								<span v-if="isLocked(group, visit)" class="badge badge-locked"
									>LÅST</span
								>
							</div>
							<div class="mr-visit-actions">
								<button
									:disabled="idx === 0"
									title="Flyt op"
									@click="moveUp(group, visit, idx)"
								>
									↑
								</button>
								<button
									:disabled="idx === orderedVisits(group).length - 1"
									title="Flyt ned"
									@click="moveDown(group, visit, idx)"
								>
									↓
								</button>
								<button
									v-if="!isSegmentStart(group, visit, idx)"
									title="Start nyt segment her"
									@click="splitSegment(group, visit, idx)"
								>
									‖
								</button>
								<button
									v-if="isSegmentStart(group, visit, idx) && idx > 0"
									title="Flet med forrige segment"
									@click="joinSegment(group, visit, idx)"
								>
									⏶
								</button>
							</div>
						</div>
					</div>
				</div>
				<div v-if="!groups.length" class="mr-empty">Ingen grupper fundet</div>
			</div>
		</div>
		<div class="mr-map">
			<div ref="mapContainer" class="map-container"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { styleUrl } from '@/api/maptiler'
import { visitsApi } from '@/api/visits'
import { usersApi } from '@/api/users'
import { errorApi } from '@/utils/axios'
import { decodePolyline } from '@/utils/polyline'
import type { RouteSettings } from '@/schemas'

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
const selectedGroups = ref<VisitGroup[]>([])
const error = ref<string | null>(null)
const optimizing = ref(false)
const optimizedLegs = ref<Record<string, [number, number][][]>>({})
const overrunMap = ref<Record<string, boolean>>({})
const settings = ref<RouteSettings>({
	start_time: '13:00',
	service_minutes: 15,
	end_time: '20:00',
	anchor: 'start',
})
const savingSettings = ref(false)
const settingsSaved = ref(false)
const autoRecompute = ref(false)

const GROUP_COLORS = [
	'#6366f1',
	'#10b981',
	'#f59e0b',
	'#ef4444',
	'#8b5cf6',
	'#ec4899',
	'#06b6d4',
	'#84cc16',
]

function groupColor(key: string): string {
	let h = 0
	for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
	return GROUP_COLORS[h % GROUP_COLORS.length]
}

const srcRoute = (key: string) => `route-${key}`
const srcPoints = (key: string) => `points-${key}`
const srcOptimized = (key: string) => `optimized-${key}`
const layerRoute = (key: string) => `route-layer-${key}`
const layerPoints = (key: string) => `points-layer-${key}`
const layerLabel = (key: string) => `points-label-${key}`
const layerOptimized = (key: string) => `optimized-layer-${key}`

const mapReady = ref(false)
const layerKeys = ref<Set<string>>(new Set())

function orderedVisits(group: VisitGroup): VisitData[] {
	return [...group.visits].sort((a, b) => a.stop_nr - b.stop_nr)
}

function isSelected(key: string): boolean {
	return selectedGroups.value.some((g) => g.key === key)
}

function isSegmentStart(group: VisitGroup, visit: VisitData, idx: number): boolean {
	if (idx === 0) return true
	const prev = orderedVisits(group)[idx - 1]
	return prev.segment_index !== visit.segment_index
}

function isSegmentEnd(group: VisitGroup, visit: VisitData, idx: number): boolean {
	if (idx === orderedVisits(group).length - 1) return true
	const next = orderedVisits(group)[idx + 1]
	return next.segment_index !== visit.segment_index
}

function isLocked(group: VisitGroup, visit: VisitData): boolean {
	return (
		visit.segment_index !== null &&
		orderedVisits(group).filter((v) => v.segment_index === visit.segment_index).length === 1
	)
}

function toggleSelectGroup(group: VisitGroup) {
	const idx = selectedGroups.value.findIndex((g) => g.key === group.key)
	if (idx >= 0) {
		selectedGroups.value.splice(idx, 1)
		optimizedLegs.value[group.key] = []
		overrunMap.value[group.key] = false
	} else {
		selectedGroups.value.push(group)
		loadRoute(Number(group.key))
	}
	updateMap()
}

function formatDate(date: string | null | undefined): string {
	if (!date) return ''
	const d = new Date(date)
	if (isNaN(d.getTime())) return ''
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

function shortAddress(address: string): string {
	const parts = address
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
	return parts.length > 1 ? parts.slice(1).join(', ') : address
}

async function loadRoute(groupId: number) {
	const key = String(groupId)
	try {
		const route = await visitsApi.getGroupRoute(groupId)
		optimizedLegs.value[key] = route.geometry.map((g) => decodePolyline(g))
		overrunMap.value[key] = route.overrun
	} catch (err: any) {
		optimizedLegs.value[key] = []
		overrunMap.value[key] = false
		errorApi.logError(err)
	}
	updateMap()
}

async function loadSettings() {
	try {
		settings.value = await visitsApi.getRouteSettings()
	} catch (err: any) {
		errorApi.logError(err)
	}
}

async function saveSettings() {
	if (savingSettings.value) return
	savingSettings.value = true
	settingsSaved.value = false
	try {
		settings.value = await visitsApi.saveRouteSettings(settings.value)
		settingsSaved.value = true
	} catch (err: any) {
		error.value = 'Kunne ikke gemme indstillinger'
		errorApi.logError(err)
	} finally {
		savingSettings.value = false
	}
}

async function afterOrderChange(group: VisitGroup) {
	if (autoRecompute.value) {
		try {
			await visitsApi.recomputeGroupRoute(Number(group.key))
		} catch (err: any) {
			error.value = 'Kunne ikke genberegne tider'
			errorApi.logError(err)
		}
	}
	await refresh()
}

function toCoord(v: VisitData): [number, number] | null {
	const lat = Number(v.latitude)
	const lng = Number(v.longitude)
	if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null
	return [lng, lat]
}

async function moveUp(group: VisitGroup, visit: VisitData, idx: number) {
	if (idx === 0 || updating) return
	updating = true
	try {
		await visitsApi.reorderVisit(Number(group.key), visit.ID, 'up')
		await afterOrderChange(group)
	} catch (err: any) {
		error.value = 'Fejl ved omordning'
		errorApi.logError(err)
	} finally {
		updating = false
	}
}

async function moveDown(group: VisitGroup, visit: VisitData, idx: number) {
	if (idx === orderedVisits(group).length - 1 || updating) return
	updating = true
	try {
		await visitsApi.reorderVisit(Number(group.key), visit.ID, 'down')
		await afterOrderChange(group)
	} catch (err: any) {
		error.value = 'Fejl ved omordning'
		errorApi.logError(err)
	} finally {
		updating = false
	}
}

async function splitSegment(group: VisitGroup, visit: VisitData, idx: number) {
	if (updating) return
	updating = true
	try {
		await visitsApi.splitSegment(Number(group.key), visit.ID)
		await afterOrderChange(group)
	} catch (err: any) {
		error.value = 'Fejl ved opdeling af segment'
		errorApi.logError(err)
	} finally {
		updating = false
	}
}

async function joinSegment(group: VisitGroup, visit: VisitData, idx: number) {
	if (updating) return
	updating = true
	try {
		await visitsApi.joinSegment(Number(group.key), visit.ID)
		await afterOrderChange(group)
	} catch (err: any) {
		error.value = 'Fejl ved sammenlægning af segment'
		errorApi.logError(err)
	} finally {
		updating = false
	}
}

async function optimizeGroup(group: VisitGroup) {
	if (updating || optimizing.value) return
	optimizing.value = true
	error.value = null
	const key = group.key
	try {
		const res = await visitsApi.optimizeGroup(Number(key), {
			costing: 'auto',
			mode: 'time',
		})
		overrunMap.value[key] = res.overrun
		await refresh()
		optimizedLegs.value[key] = res.geometry.map((g) => decodePolyline(g))
		updateMap()
	} catch (err: any) {
		optimizedLegs.value[key] = []
		overrunMap.value[key] = false
		error.value = 'Optimering fejlede'
		errorApi.logError(err)
		updateMap()
	} finally {
		optimizing.value = false
	}
}

async function refresh() {
	if (!selectedGroups.value.length) return
	const all = await visitsApi.getPlanned()
	const flat: VisitData[] = (all || []).flatMap((k: any) =>
		(k.visits || []).map((v: any) => ({
			...v,
			konsulentName: k.name,
		})),
	)
	groups.value = buildGroups(flat)
	const keys = selectedGroups.value.map((g) => g.key)
	selectedGroups.value = keys
		.map((k) => groups.value.find((g) => g.key === k))
		.filter(Boolean) as VisitGroup[]
	optimizedLegs.value = {}
	overrunMap.value = {}
	await Promise.all(selectedGroups.value.map((g) => loadRoute(Number(g.key))))
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

function buildRouteFC(group: VisitGroup): GeoJSON.FeatureCollection {
	const list = orderedVisits(group)
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
					properties: {},
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
			properties: { id: v.ID, label: String(v.stop_nr) },
		})
	})

	return { type: 'FeatureCollection', features }
}

function emptyFC(): GeoJSON.FeatureCollection {
	return { type: 'FeatureCollection', features: [] }
}

function buildOptimizedFC(key: string): GeoJSON.FeatureCollection {
	const features: GeoJSON.Feature[] = (optimizedLegs.value[key] ?? [])
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
	if (!map || !mapReady.value || !selectedGroups.value.length) return
	syncGroupLayers()

	for (const group of selectedGroups.value) {
		const key = group.key
		const fc = buildRouteFC(group)
		const src = map.getSource(srcRoute(key)) as maplibregl.GeoJSONSource | undefined
		src?.setData((optimizedLegs.value[key]?.length ?? 0) ? emptyFC() : fc)

		const ptsSrc = map.getSource(srcPoints(key)) as maplibregl.GeoJSONSource | undefined
		ptsSrc?.setData(fc)

		const optSrc = map.getSource(srcOptimized(key)) as maplibregl.GeoJSONSource | undefined
		optSrc?.setData(buildOptimizedFC(key))
	}

	// Fit bounds across all selected groups
	const coords: [number, number][] = []
	for (const group of selectedGroups.value) {
		for (const v of orderedVisits(group)) {
			const c = toCoord(v)
			if (c) coords.push(c)
		}
	}
	if (coords.length > 0) {
		const bounds = coords.reduce(
			(b, c) => b.extend(c),
			new maplibregl.LngLatBounds(coords[0], coords[0]),
		)
		map.fitBounds(bounds, { padding: 60, maxZoom: 14 })
	}
}

function addGroupLayers(key: string) {
	if (!map) return
	const color = groupColor(key)

	ensureSource(srcRoute(key), emptyFC())
	ensureLayer(layerRoute(key), {
		type: 'line',
		source: srcRoute(key),
		paint: {
			'line-color': color,
			'line-width': 4,
			'line-opacity': 0.8,
		},
		filter: ['==', '$type', 'LineString'],
	})

	ensureSource(srcOptimized(key), emptyFC())
	ensureLayer(layerOptimized(key), {
		type: 'line',
		source: srcOptimized(key),
		paint: {
			'line-color': '#2563eb',
			'line-width': 4,
			'line-opacity': 0.9,
			'line-dasharray': [2, 1],
		},
		filter: ['==', '$type', 'LineString'],
	})

	ensureSource(srcPoints(key), emptyFC())
	ensureLayer(layerPoints(key), {
		type: 'circle',
		source: srcPoints(key),
		paint: {
			'circle-radius': 8,
			'circle-color': color,
			'circle-stroke-color': '#ffffff',
			'circle-stroke-width': 2,
		},
		filter: ['==', '$type', 'Point'],
	})
	ensureLayer(layerLabel(key), {
		type: 'symbol',
		source: srcPoints(key),
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

function removeGroupLayers(key: string) {
	if (!map) return
	for (const l of [layerLabel(key), layerPoints(key), layerOptimized(key), layerRoute(key)]) {
		if (map.getLayer(l)) map.removeLayer(l)
	}
	for (const s of [srcPoints(key), srcOptimized(key), srcRoute(key)]) {
		if (map.getSource(s)) map.removeSource(s)
	}
}

function syncGroupLayers() {
	if (!map) return
	const want = new Set(selectedGroups.value.map((g) => g.key))
	for (const key of layerKeys.value) {
		if (!want.has(key)) removeGroupLayers(key)
	}
	for (const key of want) {
		if (!map.getLayer(layerRoute(key))) addGroupLayers(key)
	}
	layerKeys.value = want
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
	loadSettings()

	const container = mapContainer.value
	if (!container) return

	map = new maplibregl.Map({
		container,
		style: styleUrl('basic-preview'),
		center: [11.68, 56.25],
		zoom: 6,
	})

	map.on('load', () => {
		mapReady.value = true
		updateMap()
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
	align-items: stretch;
}
.mr-side {
	flex: 0 0 480px;
	display: flex;
	flex-direction: column;
	max-height: 100%;
}
.mr-settings {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	padding: 8px 12px;
	background: white;
	border: 1px solid #e5e7eb;
	border-radius: 6px 6px 0 0;
	font-size: 12px;
	color: #374151;
}
.mr-setting {
	display: flex;
	align-items: center;
	gap: 4px;
}
.mr-setting input[type='time'],
.mr-setting input[type='number'],
.mr-setting select {
	width: 84px;
	padding: 2px 4px;
	font-size: 12px;
	border: 1px solid #d1d5db;
	border-radius: 4px;
}
.mr-setting input[type='number'] {
	width: 48px;
}
.mr-save {
	padding: 3px 10px;
	font-size: 12px;
	font-weight: 600;
	color: #fff;
	background: #6366f1;
	border: none;
	border-radius: 4px;
	cursor: pointer;
}
.mr-save:hover:not(:disabled) {
	background: #4f46e5;
}
.mr-save:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
.mr-saved {
	color: #059669;
	font-size: 12px;
}
.mr-list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	border: 1px solid #e5e7eb;
	border-top: none;
	border-radius: 0 0 6px 6px;
	padding: 12px;
	background: #f9fafb;
}
.mr-list-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}
.mr-list-head h3 {
	margin: 0;
}
.mr-auto-toggle {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	color: #374151;
	cursor: pointer;
	white-space: nowrap;
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
	display: flex;
	align-items: center;
	gap: 6px;
	font-weight: 600;
	color: #374151;
}
.mr-group-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	display: inline-block;
	flex-shrink: 0;
}
.mr-overrun {
	color: #b91c1c;
	font-size: 12px;
	font-weight: 600;
}
.mr-hint {
	font-size: 12px;
	color: #6b7280;
	margin-bottom: 12px;
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
.mr-time {
	font-weight: 600;
	color: #1d4ed8;
	min-width: 42px;
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
