import api from '@/utils/axios'

const tilesBase = `${api.defaults.baseURL}/tiles`
const geocodeBase = `${api.defaults.baseURL}/geocode`

export type MapStyle =
	| 'basic-preview'
	| 'basic'
	| 'streets'
	| 'dataviz'
	| 'topo'
	| 'hybrid'
	| 'toner'
	| 'positron'
	| 'darkmatter'

/** URL to a MapTiler style JSON for MapLibre GL, proxied through the backend. */
export const styleUrl = (style: MapStyle = 'basic-preview') =>
	`${tilesBase}/styles/${style}/style.json`

export type PhotonFeature = {
	geometry: { type: 'Point'; coordinates: [number, number] }
	properties: {
		name?: string
		street?: string
		housenumber?: string
		postcode?: string
		city?: string
		state?: string
		country?: string
		district?: string
		osm_type?: string
		osm_value?: string
		type?: string
		extent?: [number, number, number, number]
	}
	type: 'Feature'
}

export interface PhotonResponse {
	features: PhotonFeature[]
}

export async function geocode(query: string): Promise<PhotonResponse> {
	const res = await api.get(`${geocodeBase}/api/`, {
		params: { q: query, limit: 10 },
	})
	return res.data
}

export async function geocodeStructured(params: {
	street?: string
	housenumber?: string
	postcode?: string
	city?: string
}): Promise<PhotonResponse> {
	const res = await api.get(`${geocodeBase}/structured`, {
		params: { ...params, limit: 10, countrycode: 'DK' },
	})
	return res.data
}

export async function reverseGeocode(lng: number, lat: number): Promise<PhotonResponse> {
	const res = await api.get(`${geocodeBase}/reverse`, {
		params: { lon: lng, lat },
	})
	return res.data
}
