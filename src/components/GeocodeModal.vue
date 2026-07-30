<template>
	<Teleport to="body">
		<div v-if="show">
			<div class="modal-backdrop fade show"></div>
			<div
				class="modal fade show d-block"
				tabindex="-1"
				style="display: block"
				role="dialog"
			>
				<div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title">Geokodning af adresser</h5>
							<button type="button" class="btn-close" @click="handleClose" aria-label="Luk"></button>
						</div>
						<div class="modal-body">
							<div v-if="items.length === 0" class="text-center py-4 text-muted">
								Vent venligst... Indlæser adresser.
							</div>

							<div
								v-for="(item, idx) in items"
								:key="idx"
								class="card mb-3"
								:class="{
									'border-secondary': item.status === 'pending',
									'border-info': item.status === 'geocoding',
									'border-success': item.status === 'done',
									'border-danger': item.status === 'error',
								}"
							>
								<div class="card-header d-flex justify-content-between align-items-center">
									<strong class="text-truncate me-2">
										#{{ item.visit.sagsnr }} — {{ item.visit.adresse }},
										{{ item.visit.postnr }} {{ item.visit.bynavn }}
									</strong>
									<span
										class="badge"
										:class="{
											'bg-secondary': item.status === 'pending',
											'bg-info': item.status === 'geocoding',
											'bg-success': item.status === 'done',
											'bg-danger': item.status === 'error',
										}"
									>
										{{ statusLabel(item.status) }}
									</span>
								</div>
								<div class="card-body">
									<!-- Geocoding in progress -->
									<div v-if="item.status === 'geocoding'" class="text-center py-2">
										<div class="spinner-border spinner-border-sm text-info me-2" role="status"></div>
										Geokoder...
									</div>

									<!-- Error state -->
									<div v-if="item.status === 'error'" class="alert alert-danger py-2 mb-2">
										{{ item.error }}
									</div>

									<!-- Results list -->
									<div v-if="item.results.length > 0 && item.status !== 'done'" class="mb-2">
										<label class="form-label fw-semibold">Vælg den korrekte adresse:</label>
										<div
											v-for="(feature, fIdx) in item.results"
											:key="fIdx"
											class="form-check mb-1"
										>
											<input
												class="form-check-input"
												type="radio"
												:name="'result-' + idx"
												:value="fIdx"
												:id="'result-' + idx + '-' + fIdx"
												@change="selectResult(idx, feature)"
											/>
											<label class="form-check-label" :for="'result-' + idx + '-' + fIdx">
												{{ formatFeature(feature) }}
											</label>
										</div>
									</div>

									<!-- No results -->
									<div
										v-if="item.results.length === 0 && item.status === 'done' && !item.selectedResult"
										class="alert alert-warning py-2 mb-2"
									>
										Ingen resultater fra geokodning.
									</div>

									<!-- Manual address input -->
									<div class="mb-2">
										<label class="form-label fw-semibold">Eller indtast adresse manuelt:</label>
										<div class="input-group">
											<input
												type="text"
												class="form-control form-control-sm"
												:placeholder="item.visit.adresse + ', ' + item.visit.postnr + ' ' + item.visit.bynavn"
												v-model="item.manualAddress"
												@input="onManualInput(idx)"
											/>
											<button
												v-if="item.manualAddress && item.status !== 'done'"
												class="btn btn-sm btn-outline-success"
												@click="manualGeocode(idx)"
												:disabled="geocodingSet.has(idx)"
											>
												Søg
											</button>
										</div>
									</div>

									<!-- Confirm button -->
									<div v-if="item.status !== 'done'" class="text-end">
										<button
											class="btn btn-sm btn-success"
											@click="confirmVisit(idx)"
											:disabled="!canConfirm(item)"
										>
											Bekræft adresse
										</button>
									</div>
									<div v-else class="text-end text-success">
										<i class="bi bi-check-circle"></i> Adresse bekræftet
									</div>
								</div>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" @click="handleClose">Annuller</button>
							<button
								type="button"
								class="btn btn-primary"
								@click="handleConfirm"
								:disabled="!allConfirmed"
							>
								Opret {{ confirmedCount }} besøg
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { geocode } from '@/api/maptiler'
import type { PhotonFeature } from '@/api/maptiler'

interface VisitItem {
	sagsnr: number | string
	adresse: string
	postnr: string
	bynavn: string
	klientnavn: string
	klientRef: string
	sagvedr: string
	frist_dato: string
	klientnr?: number
	debtors: { debitorId?: number; navn: string }[]
	index?: number
}

export interface GeocodedVisit {
	sagsnr: number | string
	adresse: string
	postnr: string
	bynavn: string
	klientnavn: string
	klientRef: string
	sagvedr: string
	frist_dato: string
	klientnr?: number
	debtors: { debitorId?: number; navn: string }[]
	visit_type: { ID: number; text: string } | null
	latitude: string
	longitude: string
	geocoding_address: string
}

interface GeocodeItem {
	visit: VisitItem
	status: 'pending' | 'geocoding' | 'done' | 'error'
	results: PhotonFeature[]
	selectedResult: PhotonFeature | null
	manualAddress: string
	error: string | null
}

const geocodingSet = ref<Set<number>>(new Set())

const props = defineProps<{
	show: boolean
	visits: VisitItem[]
	visitType: { ID: number; text: string } | null
}>()

const emit = defineEmits<{
	close: []
	confirm: [data: GeocodedVisit[]]
}>()

const items = ref<GeocodeItem[]>([])

watch(
	() => props.show,
	async (val) => {
		if (val) {
			items.value = props.visits.map((v) => ({
				visit: v,
				status: 'pending' as const,
				results: [],
				selectedResult: null,
				manualAddress: '',
				error: null,
			}))
			await nextTick()
			startGeocoding()
		}
	},
)

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape' && props.show) handleClose()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function statusLabel(s: string): string {
	switch (s) {
		case 'pending':
			return 'Venter'
		case 'geocoding':
			return 'Geokoder...'
		case 'done':
			return 'OK'
		case 'error':
			return 'Fejl'
		default:
			return s
	}
}

function buildQuery(visit: VisitItem): string {
	const parts = [visit.adresse]
	if (visit.postnr) parts.push(visit.postnr)
	if (visit.bynavn) parts.push(visit.bynavn)
	return parts.join(', ')
}

async function startGeocoding() {
	for (let idx = 0; idx < items.value.length; idx++) {
		const item = items.value[idx]
		item.status = 'geocoding'
		try {
			const query = buildQuery(item.visit)
			const response = await geocode(query)
			item.results = response.features
			if (item.results.length === 1) {
				item.selectedResult = item.results[0]
			} else if (item.results.length > 1) {
				item.selectedResult = item.results[0]
			}
		} catch (err: any) {
			item.error = err?.message || 'Geokodning fejlede'
			item.status = 'error'
		}
	}
}

function selectResult(idx: number, feature: PhotonFeature) {
	items.value[idx].selectedResult = feature
}

function formatFeature(f: PhotonFeature): string {
	const p = f.properties
	const parts: string[] = []
	if (p.name && p.name !== p.street) parts.push(p.name)
	if (p.street) {
		let s = p.street
		if (p.housenumber) s += ' ' + p.housenumber
		parts.push(s)
	}
	if (p.postcode) parts.push(p.postcode)
	if (p.city) parts.push(p.city)
	if (p.state) parts.push(p.state)
	if (p.country) parts.push(p.country)
	return parts.join(', ') || 'Ukendt adresse'
}

function onManualInput(idx: number) {
	items.value[idx].selectedResult = null
}

async function manualGeocode(idx: number) {
	const item = items.value[idx]
	if (!item.manualAddress.trim()) return
	geocodingSet.value.add(idx)
	item.status = 'geocoding'
	item.results = []
	item.selectedResult = null
	try {
		const response = await geocode(item.manualAddress.trim())
		item.results = response.features
		if (item.results.length > 0) {
			item.selectedResult = item.results[0]
		}
	} catch (err: any) {
		item.error = err?.message || 'Geokodning fejlede'
		item.status = 'error'
	} finally {
		geocodingSet.value.delete(idx)
	}
}

function canConfirm(item: GeocodeItem): boolean {
	return item.selectedResult !== null || item.manualAddress.trim() !== ''
}

function confirmVisit(idx: number) {
	items.value[idx].status = 'done'
}

const allConfirmed = computed(() => {
	return items.value.length > 0 && items.value.every((item) => item.status === 'done')
})

const confirmedCount = computed(() => items.value.filter((i) => i.status === 'done').length)

function handleClose() {
	emit('close')
}

function handleConfirm() {
	const result: GeocodedVisit[] = items.value.map((item) => {
		let latitude = ''
		let longitude = ''
		let geocodingAddress = item.manualAddress.trim()

		if (item.selectedResult) {
			const coords = item.selectedResult.geometry.coordinates
			longitude = String(coords[0])
			latitude = String(coords[1])
			if (!geocodingAddress) {
				geocodingAddress = formatFeature(item.selectedResult)
			}
		}

		if (!geocodingAddress) {
			geocodingAddress = buildQuery(item.visit)
		}

		return {
			...item.visit,
			visit_type: props.visitType,
			latitude,
			longitude,
			geocoding_address: geocodingAddress,
		}
	})
	emit('confirm', result)
}
</script>
