//maptiler.ts
import api from '@/utils/axios'

const tilesBase = `${api.defaults.baseURL}/tiles`
const geocodeBase = `${api.defaults.baseURL}/geocode`

export type MapStyle =
	| 'streets'
	| 'outdoor'
	| 'satellite'
	| 'hybrid'
	| 'basic'
	| 'topo'
	| 'winter'
	| 'dataviz'
	| 'ocean'

/** URL to a MapTiler style JSON for MapLibre GL, proxied through the backend. */
export const styleUrl = (style: MapStyle = 'streets') => `${tilesBase}/maps/${style}/style.json`

/** Generic tile URL builder through the backend proxy. */
export const tileUrl = (path: string) => `${tilesBase}/${path.replace(/^\//, '')}`

// --- Geocoding via Photon (proxied through backend) ---

export interface PhotonFeature {
	geometry: { type: 'Point'; coordinates: [number, number] }
	properties: {
		name?: string
		street?: string
		housenumber?: string
		postcode?: string
		city?: string
		state?: string
		country?: string
	}
	type: 'Feature'
}

export interface PhotonResponse {
	features: PhotonFeature[]
}

export async function geocode(query: string): Promise<PhotonResponse> {
	const res = await api.get(`${geocodeBase}/api`, {
		params: { q: query, lang: 'da', limit: 10 },
	})
	return res.data
}

export async function reverseGeocode(lng: number, lat: number): Promise<PhotonResponse> {
	const res = await api.get(`${geocodeBase}/reverse`, {
		params: { lon: lng, lat },
	})
	return res.data
}
