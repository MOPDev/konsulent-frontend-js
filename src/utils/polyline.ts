// Decodes a Google/Valhalla encoded polyline into [lat, lon] pairs.
// Valhalla returns polyline6 (precision 6) for route shapes.
export function decodePolyline(encoded: string, precision = 6): [number, number][] {
	const factor = 10 ** precision
	const coords: [number, number][] = []
	let index = 0
	let lat = 0
	let lon = 0

	while (index < encoded.length) {
		let result = 0
		let shift = 0
		let byte: number
		do {
			byte = encoded.charCodeAt(index++) - 63
			result |= (byte & 0x1f) << shift
			shift += 5
		} while (byte >= 0x20)
		lat += result & 1 ? ~(result >> 1) : result >> 1

		result = 0
		shift = 0
		do {
			byte = encoded.charCodeAt(index++) - 63
			result |= (byte & 0x1f) << shift
			shift += 5
		} while (byte >= 0x20)
		lon += result & 1 ? ~(result >> 1) : result >> 1

		coords.push([lat / factor, lon / factor])
	}

	return coords
}

// canonical example from the polyline algorithm reference, decoded at precision 5
if (import.meta.env.DEV) {
	const got = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)
	const want: [number, number][] = [
		[38.5, -120.2],
		[40.7, -120.95],
		[43.252, -126.453],
	]
	const ok = got.length === want.length && got.every((c, i) => Math.abs(c[0] - want[i][0]) < 1e-9 && Math.abs(c[1] - want[i][1]) < 1e-9)
	if (!ok) throw new Error(`decodePolyline self-check failed: ${JSON.stringify(got)}`)
}
