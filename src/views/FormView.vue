<template>
	<div>
		<div v-if="!visitData">Indlæser...</div>
		<div v-if="isSubmitting">Indsender...</div>

		<PurchaseForm
			v-if="visitData?.type?.ID === 1"
			:formData="formData"
			@update:formData="Object.assign(formData, $event)"
			:visitData="visitData"
			:docBlob="docBlob"
			@submit="() => submitForm(visitData!.ID)"
			@images="handleImageUpload"
			@remove-image="removeImageAt"
			:isSubmitting="isSubmitting"
		/>
		<LeasingForm
			v-if="visitData?.type?.ID === 2"
			:formData="formData"
			@update:formData="Object.assign(formData, $event)"
			:visitData="visitData"
			:docBlob="docBlob"
			@submit="() => submitForm(visitData!.ID)"
			@images="handleImageUpload"
			@remove-image="removeImageAt"
			:isSubmitting="isSubmitting"
		/>
		<BlancoForm
			v-if="visitData?.type?.ID === 3"
			:formData="formData"
			@update:formData="Object.assign(formData, $event)"
			:visitData="visitData"
			:docBlob="docBlob"
			@submit="() => submitForm(visitData!.ID)"
			@images="handleImageUpload"
			@remove-image="removeImageAt"
			:isSubmitting="isSubmitting"
		/>
		<LetterForm
			v-if="visitData?.type?.ID === 4"
			:formData="formData"
			@update:formData="Object.assign(formData, $event)"
			:visitData="visitData"
			:docBlob="docBlob"
			@submit="() => submitForm(visitData!.ID)"
			@images="handleImageUpload"
			@remove-image="removeImageAt"
			:isSubmitting="isSubmitting"
		/>
		<!--
    /købekontrakt 1
    /leasing 2
    blanco 3
    brev 4
    --></div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PurchaseForm from '@/components/forms/PurchaseForm.vue'
import LeasingForm from '@/components/forms/LeasingForm.vue'
import BlancoForm from '@/components/forms/BlancoForm.vue'
import LetterForm from '@/components/forms/LetterForm.vue'

import api from '@/utils/axios'
import { errorApi } from '@/utils/axios'
import { visitsApi, type VisitWithDebitors } from '@/api/visits'

interface ImageItem {
	file: File
	preview: string
	name: string
}

interface OtherAsset {
	regnr: string
	image?: { file: File }
	[key: string]: unknown
}

interface FormData {
	actual_latitude: string | null
	actual_longitude: string | null
	pos_accuracy: string | null
	contact: {
		mailbox_name: string
		letter_delivered: boolean | null
		debitor_met: boolean | null
		other_met: boolean | null
		other_title: string
		worker_met: boolean | null
		worker_title: string
		corrected_tlf: string
		corrected_mail: string
	}
	payment: {
		ReceivedPayment: boolean | null
		PaymentAmount: number | null
		PaymentMethod: string
	}
	asset: {
		asset_seen: boolean | null
		asset_accessible: boolean | null
		asset_status: string
		asset_status_note: string
		asset_cleanliness: string
		asset_cleanliness_note: string
		asset_confirmed_owner: boolean | null
		asset_keys_delivered: boolean | null
		sf_signed: boolean | null
		odometer_km: number | null
		contract_type: string
		is_seized: boolean | null
		handover_strategy: string
		handover_strategy_note: string
		transport_provider: string
		final_vehicle_location: string
		final_vehicle_location_note: string
	}
	property: {
		property_type: string | null
		OvergrownGarden: boolean | null
		MailboxFull: boolean | null
		BrokenWindows: boolean | null
		AbandonedVehicles: boolean | null
		TrashOverflown: boolean | null
		ForsaleSign: boolean | null
	}
	monetary: {
		civil_status: string
		children_over_18: number | null
		children_under_18: number | null
		has_work: boolean | null
		position: string
		net_salary_min: number | null
		net_salary_max: number | null
		income_payment_min: number | null
		income_payment_max: number | null
		monthly_disposable_min: number | null
		monthly_disposable_max: number | null
		debt_amount_paid: number | null
	}
	other_assets: OtherAsset[]
	images: ImageItem[]
	comments: string
}

const router = useRouter()
const route = useRoute()
const ID = Number(route.params.id)
const visitData = ref<(VisitWithDebitors & { debt?: any }) | null>(null)
const isSubmitting = ref<boolean>(false)
const isCapturingLocation = ref<boolean>(false)
const debtData = ref<any>(null)
const restgadoAntagetVal = ref<number>(0)
const startTime = ref<Date | null>(null)
const docBlob = ref<Blob | null>(null)

const formData = reactive<FormData>({
	actual_latitude: null,
	actual_longitude: null,
	pos_accuracy: null,
	contact: {
		mailbox_name: '',
		letter_delivered: null,
		debitor_met: null,
		other_met: null,
		other_title: '',
		worker_met: null,
		worker_title: '',
		corrected_tlf: '',
		corrected_mail: '',
	},
	payment: {
		ReceivedPayment: null,
		PaymentAmount: null,
		PaymentMethod: '',
	},
	asset: {
		asset_seen: null,
		asset_accessible: null,
		asset_status: '',
		asset_status_note: '',
		asset_cleanliness: '',
		asset_cleanliness_note: '',
		asset_confirmed_owner: null,
		asset_keys_delivered: null,
		sf_signed: null,
		odometer_km: null,
		contract_type: '',
		is_seized: null,
		handover_strategy: '',
		handover_strategy_note: '',
		transport_provider: '',
		final_vehicle_location: '',
		final_vehicle_location_note: '',
	},
	property: {
		property_type: null,
		OvergrownGarden: null,
		MailboxFull: null,
		BrokenWindows: null,
		AbandonedVehicles: null,
		TrashOverflown: null,
		ForsaleSign: null,
	},
	monetary: {
		civil_status: '',
		children_over_18: null,
		children_under_18: null,
		has_work: null,
		position: '',
		net_salary_min: null,
		net_salary_max: null,
		income_payment_min: null,
		income_payment_max: null,
		monthly_disposable_min: null,
		monthly_disposable_max: null,
		debt_amount_paid: null,
	},
	other_assets: [],
	images: [],
	comments: '',
})

watch(
	() => formData.asset.asset_seen,
	(newVal: boolean | null) => {
		if (newVal === false || newVal === null) {
			formData.asset.odometer_km = null
			formData.asset.asset_accessible = null
			formData.asset.asset_status = ''
			formData.asset.asset_status_note = ''
			formData.asset.asset_cleanliness = ''
			formData.asset.asset_cleanliness_note = ''
		}
	},
)

watch(
	() => formData.contact.debitor_met,
	(newVal: boolean | null) => {
		if (newVal === false || newVal === null) {
			formData.monetary.civil_status = ''
			formData.monetary.children_under_18 = null
			formData.monetary.children_over_18 = null
			formData.monetary.has_work = null
			formData.monetary.position = ''
			formData.monetary.net_salary_min = null
			formData.monetary.net_salary_max = null
			formData.asset.sf_signed = null
		}
	},
)

watch(
	() => formData.monetary.has_work,
	(newVal: boolean | null) => {
		if (newVal === false || newVal === null) {
			formData.monetary.position = ''
			formData.monetary.net_salary_min = null
			formData.monetary.net_salary_max = null
		}
	},
)

watch(
	() => formData.payment.ReceivedPayment,
	(newVal: boolean | null) => {
		if (newVal === false || newVal === null) {
			formData.payment.PaymentAmount = null
			formData.payment.PaymentMethod = ''
		}
	},
)

watch(
	() => formData.asset.is_seized,
	(newVal: boolean | null) => {
		if (newVal === false || newVal === null) {
			formData.asset.handover_strategy = ''
			formData.asset.handover_strategy_note = ''
			formData.asset.transport_provider = ''
		}
	},
)

function removeImageAt(i: number) {
	const [removed] = formData.images.splice(i, 1)
	if (removed?.preview) {
		try {
			URL.revokeObjectURL(removed.preview)
		} catch {
			console.log('an error ocurred')
			errorApi.log('Error revoking object URL for removed image: ' + removed.name)
		}
	}
}

onMounted(async () => {
	startTime.value = new Date()

	try {
		visitData.value = await visitsApi.getById(ID)
		const debt = await api.get('/visits/debt', { params: { VisitId: ID } })

		if (visitData.value) visitData.value.debt = debt.data[0]
		debtData.value = debt

		await getLocation()

		loadDocument(ID).catch((err: any) => console.error('Doc load failed:', err))
	} catch (error: any) {
		console.error('Error fetching visit:', error)
		errorApi.log('Error fetching visit: ' + error.message)
	}

	const antaget = parseFloat(debtData.value?.RestgeldAntaget)
	restgadoAntagetVal.value = antaget === 0 ? debtData.value?.RestgeldVedBrev : antaget
})

const loadDocument = async (ID: number) => {
	try {
		const response = await api.get('/visits/document', {
			params: { VisitId: ID },
			responseType: 'blob',
		})
		docBlob.value = response.data
	} catch (err: any) {
		errorApi.logError(err)
		console.error('Document loading failed', err)
		errorApi.log('Document loading failed: ' + err.message)
	}
}

function fixMinMax(min: number | null, max: number | null): [number | null, number | null] {
	if (min !== null && max !== null) {
		if (min > max) {
			return [max, min]
		}
		return [min, max]
	}
	return [min, max]
}

async function submitForm(visitId: number) {
	if (formData.asset.asset_seen && formData.images.length === 0) {
		alert('Du skal tilføje mindst ét billede når køretøjet er til stede.')
		return
	}
	isSubmitting.value = true
	try {
		const now = new Date()
		const duration = (now as any) - (startTime.value as any)

		if (visitData.value?.type?.ID === 1) {
			formData.asset.contract_type = 'Købekontrakt'
		} else if (visitData.value?.type?.ID === 2) {
			formData.asset.contract_type = 'Leasing'
		} else if (visitData.value?.type?.ID === 3) {
			formData.asset.contract_type = 'Blanco'
		}

		// verify that the min values are not greater than the max values for monetary fields
		// salary
		// verify that the min values are not greater than the max values for monetary fields
		// salary
		;[formData.monetary.net_salary_min, formData.monetary.net_salary_max] = fixMinMax(
			formData.monetary.net_salary_min,
			formData.monetary.net_salary_max,
		)
		// income
		;[formData.monetary.income_payment_min, formData.monetary.income_payment_max] = fixMinMax(
			formData.monetary.income_payment_min,
			formData.monetary.income_payment_max,
		)
		// disposable
		;[formData.monetary.monthly_disposable_min, formData.monetary.monthly_disposable_max] =
			fixMinMax(
				formData.monetary.monthly_disposable_min,
				formData.monetary.monthly_disposable_max,
			)

		const payload = {
			visit_id: visitId,
			actual_date: now.toISOString(),
			actual_time: now.toTimeString().slice(0, 8),
			duration: duration,
			actual_latitude: formData.actual_latitude,
			actual_longitude: formData.actual_longitude,
			pos_accuracy: formData.pos_accuracy,
			contact: formData.contact,
			payment: formData.payment,
			assets: formData.asset,
			property: formData.property,
			monetary: formData.monetary,
			other_assets: formData.other_assets,
			comments: formData.comments,
		}
		const { data } = await api.post('/visit-response/create', payload)

		if (formData.images.length && data.ID) {
			await Promise.all(
				formData.images.map((img, i) => {
					const fd = new FormData()
					fd.append('visit_response_id', String(data.ID))
					fd.append('image', img.file)
					fd.append('sequence', String(i + 1))
					return api.post(`/visit-response/${data.ID}/images`, fd, {
						headers: { 'Content-Type': undefined },
					})
				}),
			)
		}

		if (data.other_assets?.length) {
			await Promise.all(
				data.other_assets
					.map((asset: any) => ({
						asset,
						match: formData.other_assets.find(
							(a: OtherAsset) => a.regnr === asset.regnr,
						),
					}))
					.filter(
						(pair: { asset: any; match: OtherAsset | undefined }) =>
							pair.match?.image?.file,
					)
					.map((pair: { asset: any; match: OtherAsset | undefined }) => {
						const fd = new FormData()
						fd.append('image', pair.match!.image!.file)
						return api.post(`/asset/${pair.asset.ID}/image`, fd, {
							headers: { 'Content-Type': undefined },
						})
					}),
			)
		}
		await api.post(`/visit-response/${data.ID}/complete`)
		sendBack()
	} catch (err: any) {
		console.error('Error submitting form:', err)
		await errorApi.log('Form submission failed: ' + err.message)
		alert('Noget gik galt: ' + err.message + ' Prøv igen.')
	} finally {
		isSubmitting.value = false
	}
}

const getLocation = () => {
	console.log('getting location')
	const fallbackLocation = {
		latitude: '0',
		longitude: '0',
		accuracy: '0',
	}

	if (!navigator.geolocation) {
		formData.actual_latitude = fallbackLocation.latitude
		formData.actual_longitude = fallbackLocation.longitude
		formData.pos_accuracy = fallbackLocation.accuracy
		return
	}

	if (!window.isSecureContext) {
		formData.actual_latitude = fallbackLocation.latitude
		formData.actual_longitude = fallbackLocation.longitude
		formData.pos_accuracy = fallbackLocation.accuracy
		return
	}

	isCapturingLocation.value = true
	let bestPosition: GeolocationPosition | null = null
	let watchId: number | null = null

	const finish = () => {
		if (watchId !== null) navigator.geolocation.clearWatch(watchId)
		if (bestPosition) {
			formData.actual_latitude = bestPosition.coords.latitude.toString()
			formData.actual_longitude = bestPosition.coords.longitude.toString()
			formData.pos_accuracy = bestPosition.coords.accuracy.toString()
		} else {
			formData.actual_latitude = fallbackLocation.latitude
			formData.actual_longitude = fallbackLocation.longitude
			formData.pos_accuracy = fallbackLocation.accuracy
		}
		isCapturingLocation.value = false
	}

	watchId = navigator.geolocation.watchPosition(
		(position) => {
			if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
				bestPosition = position
				if (position.coords.accuracy <= 15) finish()
			}
		},
		(error) => {
			console.error('GPS error:', error)
			bestPosition = null
			finish()
		},
		{ enableHighAccuracy: true },
	)

	console.log('starting geolocation')
	setTimeout(finish, 10 * 1000)
}

function handleImageUpload(e: unknown) {
	const target = (e as Event).target as HTMLInputElement
	const files = Array.from(target.files || [])
	const maxMB = 50
	const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
	files.forEach((file: File) => {
		if (!allowed.includes(file.type)) {
			errorApi.log(`Unsupported file type: ${file.type}`)
			return
		}
		if (file.size > maxMB * 1024 * 1024) {
			errorApi.log(`File too large: ${file.name}`)
			return
		}
		formData.images.push({
			file,
			preview: URL.createObjectURL(file),
			name: file.name,
		})
	})
	target.value = ''
}

watch(
	() => formData.images.map((i: ImageItem) => i.preview),
	(nv: string[], ov: string[] | undefined) => {
		const removed = (ov || []).filter((p: string) => !nv.includes(p))
		removed.forEach((p: string) => {
			try {
				URL.revokeObjectURL(p)
			} catch {
				// Ignore errors
			}
		})
	},
	{ immediate: true },
)

function sendBack() {
	const id = visitData.value?.user?.ID
	if (id) {
		router.push(`/auditor/${id}`)
	}
}
</script>
