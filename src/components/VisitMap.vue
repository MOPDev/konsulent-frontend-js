<template>
	<div class="map-wrapper">
		<div ref="mapContainer" class="map-container"></div>
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
	stop_nr?: number | null
	segment_index?: number | null
}

const props = withDefaults(
	defineProps<{
		visits: MapVisit[]
		showRoute?: boolean
		center?: [number, number]
		zoom?: number
	}>(),
	{
		showRoute: false,
		center: () => [11.68, 56.25],
		zoom: 6,
	},
)

const emit = defineEmits<{
	'visit-click': [id: number]
}>()

const mapContainer = ref<HTMLElement>()
let map: maplibregl.Map | null = null

const SRC = { visits: 'visits-src', route: 'route-src' }
const LAYER = { visits: 'visits-layer', route: 'route-layer' }

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
				properties: { id: v.ID, stop_nr: v.stop_nr, segment_index: v.segment_index },
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

function emptyFC(): GeoJSON.FeatureCollection {
	return { type: 'FeatureCollection', features: [] }
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
	}
}

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
			if (id != null) emit('visit-click', Number(id))
		})
		map!.on('mouseenter', LAYER.visits, () => {
			if (map) map.getCanvas().style.cursor = 'pointer'
		})
		map!.on('mouseleave', LAYER.visits, () => {
			if (map) map.getCanvas().style.cursor = ''
		})
	})
})

onBeforeUnmount(() => {
	map?.remove()
	map = null
})

watch(
	() => props.visits,
	() => {
		if (!map?.isStyleLoaded()) return
		const src = map.getSource(SRC.visits) as maplibregl.GeoJSONSource | undefined
		src?.setData(buildVisitsFC())
		if (props.showRoute) {
			const routeSrc = map.getSource(SRC.route) as maplibregl.GeoJSONSource | undefined
			routeSrc?.setData(buildRouteFC() ?? emptyFC())
		}
	},
	{ deep: true },
)

watch(
	() => props.showRoute,
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
</style>
