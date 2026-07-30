export type ParsedAddress = {
	street: string
	housenumber: string
	unit: string | null
}

// 1. Parser remains the same (fixed to handle ST/TH/TV)
export function parseDanishAddress(address: string): ParsedAddress | null {
	const input = address.normalize('NFC').trim().replace(/\s+/g, ' ')

	// Step 1: Extract street name (everything before the first number)
	// Match everything up to the first digit(s) that represent a house number
	const match = input.match(/^(.+?)\s+(\d+)(.*)$/u)
	if (!match) return null

	const street = match[1].trim()
	const housenumber = match[2].trim() // Just the digits: "5", "11", "72", "217"
	const remainder = match[3].trim() // Everything after: "E, 2. -3", "ST TH", "5 TV", etc.

	// Step 2: Process the remainder to extract any letter suffix for the housenumber
	// Danish house numbers can have a letter: 2E, 5D, 217A, etc.
	// But we must NOT capture ST, TH, TV, MF as house number letters
	let finalHouseNumber = housenumber
	let unit = remainder || null

	// Check if the remainder starts with a single letter that's part of the house number
	// (like "E" in "2E" or "D" in "5D") versus unit designators ("ST", "TH", "TV", "MF")

	const letterMatch = remainder.match(/^([A-Za-zÆØÅæøå])\b(.*)$/u)
	if (letterMatch) {
		const possibleLetter = letterMatch[1]
		const restAfterLetter = letterMatch[2].trim()
		const isUnitLetter = ['S', 'T', 'M', 'K'].includes(possibleLetter.toUpperCase())
		// Danish floor/side indicators start with these letters

		if (!isUnitLetter) {
			// This is genuinely part of the house number (like 2E, 5D)

			finalHouseNumber += possibleLetter.toUpperCase()
			unit = restAfterLetter || null
			// If it IS a unit letter (S, T, M, K), leave it as part of the unit string
		}
	}

	if (unit) {
		unit = unit.replace(/^,\s*/, '').trim()
		if (unit === '') unit = null
	}

	return { street, housenumber: finalHouseNumber, unit }
}

// 2. Confidence evaluator – works for both structured and free‑text results
export function calculateConfidence(
	parsed: ParsedAddress,
	topFeature: any,
): { score: 'HIGH' | 'MEDIUM' | 'NO_MATCH'; details: string } {
	const props = topFeature.properties
	const name = props.name || ''
	const returnedStreet = props.street || name
	const returnedHousenumber = props.housenumber || ''

	const streetMatch = returnedStreet.toLowerCase() === parsed.street.toLowerCase()
	const housenumberMatch = returnedHousenumber === parsed.housenumber

	if (streetMatch && housenumberMatch) {
		return { score: 'HIGH', details: 'Exact street and house number matched.' }
	} else if (streetMatch) {
		return {
			score: 'MEDIUM',
			details: `Matched street "${returnedStreet}" but not house number "${parsed.housenumber}".`,
		}
	} else {
		// If the feature is a house, the returned name might be something else → NO_MATCH
		return { score: 'NO_MATCH', details: `Returned unrelated location: "${returnedStreet}".` }
	}
}

// 3. Structured search (unchanged)
async function searchStructured(
	parsed: ParsedAddress,
	postcode: string,
	city: string,
): Promise<any> {
	const url = new URL('http://192.168.2.14:2322/structured')
	url.searchParams.append('street', parsed.street)
	url.searchParams.append('housenumber', parsed.housenumber)
	url.searchParams.append('postcode', postcode)
	url.searchParams.append('city', city)
	url.searchParams.append('countrycode', 'DK')

	const response = await fetch(url.toString())
	if (!response.ok) throw new Error(`Structured API error: ${response.status}`)
	return response.json()
}

// 4. Free‑text fallback search
async function searchFreeText(fullQuery: string): Promise<any> {
	const url = new URL('http://192.168.2.14:2322/api/')
	url.searchParams.append('q', fullQuery)
	url.searchParams.append('limit', '1') // we only need the top result
	url.searchParams.append('osm_tag', 'place:house') // prefer house/address nodes

	const response = await fetch(url.toString())
	if (!response.ok) throw new Error(`Free‑text API error: ${response.status}`)
	return response.json()
}

// 5. Main geocoding function with fallback
async function geocodeAddress(rawAddress: string, postcode: string, city: string): Promise<void> {
	const parsed = parseDanishAddress(rawAddress)
	if (!parsed) {
		console.log(`❌ Could not parse address: "${rawAddress}"\n`)
		return
	}

	console.log(`📍 Searching: ${parsed.street} ${parsed.housenumber}, ${postcode} ${city}`)

	// ---------- Stage 1: Structured search ----------
	let data
	let usedFallback = false

	try {
		data = await searchStructured(parsed, postcode, city)
	} catch (err) {
		console.warn(`⚠️ Structured search failed (${err}), falling back to free‑text.`)
		usedFallback = true
	}

	// If structured gave no results or error, go to free‑text
	if (!usedFallback && (!data?.features || data.features.length === 0)) {
		console.warn('⚠️ Structured search returned 0 results, falling back to free‑text.')
		usedFallback = true
	}

	if (usedFallback || !data?.features?.length) {
		// Build the full query string exactly as you would type it
		const fullQuery = `${parsed.street} ${parsed.housenumber}, ${postcode} ${city}`
		try {
			data = await searchFreeText(fullQuery)
		} catch (err) {
			console.error(`❌ Free‑text fallback also failed: ${err}`)
			console.log('-'.repeat(50))
			return
		}
	}

	// Evaluate confidence
	const features = data?.features
	if (!features || features.length === 0) {
		console.log('❌ Confidence: NO_MATCH (both endpoints returned 0 results)\n')
		return
	}

	const top = features[0]
	const confidence = calculateConfidence(parsed, top)
	console.log(`Confidence: [${confidence.score}] - ${confidence.details}`)

	if (confidence.score === 'HIGH') {
		console.log(`✅ Coordinates: ${top.geometry.coordinates}`)
	} else {
		console.warn(
			`⚠️ Best match: "${top.properties.name || top.properties.street || 'unknown'}"`,
		)
	}
	if (usedFallback) console.log('ℹ️ (Used free‑text fallback)')
	console.log('-'.repeat(50))
}
