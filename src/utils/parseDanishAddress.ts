type ParsedAddress = {
	street: string
	housenumber: string
	unit: string | null
}

function parseDanishAddress(address: string): ParsedAddress | null {
	const input = address.normalize('NFC').trim().replace(/\s+/g, ' ')

	// Step 1: Extract street name (everything before the first number)
	// Match everything up to the first digit(s) that represent a house number
	const match = input.match(/^(.+?)\s+(\d+)(.*)$/u)

	if (!match) {
		return null
	}

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

		// Danish floor/side indicators start with these letters
		const isUnitLetter = ['S', 'T', 'M', 'K'].includes(possibleLetter.toUpperCase())

		if (!isUnitLetter) {
			// This is genuinely part of the house number (like 2E, 5D)
			finalHouseNumber += possibleLetter.toUpperCase()
			unit = restAfterLetter || null
		}
		// If it IS a unit letter (S, T, M, K), leave it as part of the unit string
	}

	// Clean up the unit string
	if (unit) {
		unit = unit.replace(/^,\s*/, '').trim()
		if (unit === '') unit = null
	}

	return { street, housenumber: finalHouseNumber, unit }
}

// CONFIDENCE EVALUATOR: Checks how well Photon's response matches our parsed inputs
function calculateMatchConfidence(
	requested: { street: string; housenumber: string },
	resultProperties: any,
): { score: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH'; details: string } {
	if (!resultProperties) {
		return { score: 'NO_MATCH', details: 'No properties returned' }
	}

	const resultStreet = (resultProperties.name || resultProperties.street || '').toLowerCase()
	const resultHouse = (resultProperties.housenumber || '').toLowerCase()
	const reqStreet = requested.street.toLowerCase()
	const reqHouse = requested.housenumber.toLowerCase()

	// Perfect Match (Street and House number match)
	if (resultStreet === reqStreet && resultHouse === reqHouse) {
		return { score: 'HIGH', details: 'Exact street and house number matched.' }
	}

	// Partial Match (Street matches, but house number is missing or different)
	if (resultStreet === reqStreet) {
		return {
			score: 'MEDIUM',
			details: `Matched street "${requested.street}" but not house number "${requested.housenumber}".`,
		}
	}

	// Low Match (Vague street match)
	if (resultStreet.includes(reqStreet) || reqStreet.includes(resultStreet)) {
		return {
			score: 'LOW',
			details: `Close street match: Got "${resultProperties.name || resultProperties.street}" instead.`,
		}
	}

	return {
		score: 'NO_MATCH',
		details: `Returned unrelated location: "${resultProperties.name || resultProperties.street}".`,
	}
}

// Photon structured API query
async function searchStructuredAddress(
	parsedAddress: ParsedAddress,
	postcode: string,
	city: string,
) {
	const baseUrl = 'http://192.168.2.14:2322/structured'

	const params = {
		street: parsedAddress.street,
		housenumber: parsedAddress.housenumber,
		postcode: postcode,
		city: city,
		countrycode: 'DK',
	}

	const url = new URL(baseUrl)
	Object.entries(params).forEach(([key, value]) => {
		url.searchParams.append(key, value)
	})

	try {
		const response = await fetch(url.toString())

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`)
		}

		const data = await response.json()

		console.log(
			`Querying: ${parsedAddress.street} ${parsedAddress.housenumber}, ${postcode} ${city}`,
		)

		if (!data.features || data.features.length === 0) {
			console.log('❌ Confidence: NO_MATCH (Photon returned 0 results)\n')
			return
		}

		const topResult = data.features[0]
		const confidence = calculateMatchConfidence(parsedAddress, topResult.properties)

		console.log(`Confidence: [${confidence.score}] - ${confidence.details}`)

		if (confidence.score === 'HIGH') {
			console.log(`📍 Coordinates: ${topResult.geometry.coordinates}`)
		} else {
			console.log(
				`⚠️ Warning: Top result returned was actually "${topResult.properties.name || topResult.properties.street} ${topResult.properties.housenumber || ''}"`,
			)
		}
		console.log('-'.repeat(50))
	} catch (error) {
		console.error(`Failed to query Photon for ${parsedAddress.street}:`, error)
	}
}
