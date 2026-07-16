<template>
	<div>
		<div v-if="!visitData">Indlæser...</div>
		<div v-if="isSubmitting">Indsender...</div>

		<PurchaseForm
			v-if="visitData?.type?.ID === 1"
			v-model:formData="formData"
			:visitData="visitData"
			:docBlob="docBlob"
			@submit="() => submitForm(visitData.ID)"
			@images="handleImageUpload"
			@remove-image="removeImageAt"
			:isSubmitting="isSubmitting"
		/>
		<LeasingForm
			v-if="visitData?.type?.ID === 2"
			v-model:formData="formData"
			:visitData="visitData"
			:docBlob="docBlob"
			@submit="() => submitForm(visitData.ID)"
			@images="handleImageUpload"
			@remove-image="removeImageAt"
			:isSubmitting="isSubmitting"
		/>
		<BlancoForm
			v-if="visitData?.type?.ID === 3"
			v-model:formData="formData"
			:visitData="visitData"
			:docBlob="docBlob"
			@submit="() => submitForm(visitData.ID)"
			@images="handleImageUpload"
			@remove-image="removeImageAt"
			:isSubmitting="isSubmitting"
		/>
		<LetterForm
			v-if="visitData?.type?.ID === 4"
			v-model:formData="formData"
			:visitData="visitData"
			:docBlob="docBlob"
			@submit="() => submitForm(visitData.ID)"
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

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PurchaseForm from '@/components/forms/PurchaseForm.vue'
import LeasingForm from '@/components/forms/LeasingForm.vue'
import BlancoForm from '@/components/forms/BlancoForm.vue'
import LetterForm from '@/components/forms/LetterForm.vue'

import api from '@/utils/axios'
import { errorApi } from '@/utils/axios'

const router = useRouter()
const route = useRoute()
const ID = Number(route.params.id)
const visitData = ref(null)
const isSubmitting = ref(false)
const isCapturingLocation = ref(false)
const debtData = ref(null)
const restgadoAntagetVal = ref(0)
const startTime = ref(null)
const docBlob = ref(null) // Store the file here

const formData = reactive({
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
	assets: {
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

// ponytail: updated watches to react to new nested formData layout
watch(
	() => formData.assets.asset_seen,
	(newVal) => {
		if (newVal === false || newVal === null) {
			formData.assets.odometer_km = null
			formData.assets.asset_accessible = null
			formData.assets.asset_status = ''
			formData.assets.asset_status_note = ''
			formData.assets.asset_cleanliness = ''
			formData.assets.asset_cleanliness_note = ''
		}
	},
)

watch(
	() => formData.contact.debitor_met,
	(newVal) => {
		if (newVal === false || newVal === null) {
			formData.monetary.civil_status = ''
			formData.monetary.children_under_18 = null
			formData.monetary.children_over_18 = null
			formData.monetary.has_work = null
			formData.monetary.position = ''
			formData.monetary.net_salary_min = null
			formData.monetary.net_salary_max = null
			formData.assets.sf_signed = null
		}
	},
)

watch(
	() => formData.monetary.has_work,
	(newVal) => {
		if (newVal === false || newVal === null) {
			formData.monetary.position = ''
			formData.monetary.net_salary_min = null
			formData.monetary.net_salary_max = null
		}
	},
)

watch(
	() => formData.payment.ReceivedPayment,
	(newVal) => {
		if (newVal === false || newVal === null) {
			formData.payment.PaymentAmount = null
			formData.payment.PaymentMethod = ''
		}
	},
)

watch(
	() => formData.assets.is_seized,
	(newVal) => {
		if (newVal === false || newVal === null) {
			formData.assets.handover_strategy = ''
			formData.assets.handover_strategy_note = ''
			formData.assets.transport_provider = ''
		}
	},
)

function removeImageAt(i) {
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
		const response = await api.get('/visits/byId', {
			params: { id: ID },
		})
		const debt = await api.get('/visits/debt', { params: { VisitId: ID } })

		visitData.value = response.data.visit

		visitData.value.debt = debt.data[0]
		debtData.value = debt

		await getLocation()

		loadDocument(ID).catch((err) => console.error('Doc load failed:', err))
	} catch (error) {
		console.error('Error fetching visit:', error)
		errorApi.log('Error fetching visit: ' + error.message)
		// Handle error appropriately
	}

	const antaget = parseFloat(debtData.value?.RestgeldAntaget)
	restgadoAntagetVal.value = antaget === 0 ? debtData.value?.RestgeldVedBrev : antaget
})

const loadDocument = async (ID) => {
	try {
		const response = await api.get('/visits/document', {
			params: { VisitId: ID },
			responseType: 'blob', // Critical
		})
		docBlob.value = response.data // Store the blob
	} catch (err) {
		console.error('Document loading failed', err)
		errorApi.log('Document loading failed: ' + err.message)
	}
}

async function submitForm(visitId) {
	if (formData.assets.asset_seen && formData.images.length === 0) {
		alert('Du skal tilføje mindst ét billede når køretøjet er til stede.')
		return
	}
	isSubmitting.value = true
	try {
		const now = new Date()
		const duration = now - startTime.value

		if (visitData.value?.type?.ID === 1) {
			formData.assets.contract_type = 'Købekontrakt'
		} else if (visitData.value?.type?.ID === 2) {
			formData.assets.contract_type = 'Leasing'
		} else if (visitData.value?.type?.ID === 3) {
			formData.assets.contract_type = 'Blanco'
		}

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
			assets: formData.assets,
			property: formData.property,
			monetary: formData.monetary,
			other_assets: formData.other_assets,
			comments: formData.comments,
		}
		const { data } = await api.post('/visit-response/create', payload)

		if (formData.images.length && data.ID) {
			for (let i = 0; i < formData.images.length; i++) {
				const { file } = formData.images[i]
				const fd = new FormData()
				fd.append('visit_response_id', data.ID)
				fd.append('image', file)
				fd.append('sequence', i + 1)
				const url = `/visit-response/${data.ID}/images`
				await api.post(url, fd, { headers: { 'Content-Type': undefined } })
			}
		}

		if (data.other_assets?.length) {
			for (const asset of data.other_assets) {
				const match = formData.other_assets.find((a) => a.regnr === asset.regnr)
				if (!match?.image?.file) continue
				const fd = new FormData()
				fd.append('image', match.image.file)
				await api.post(`/asset/${asset.ID}/image`, fd, {
					headers: { 'Content-Type': undefined },
				})
			}
		}
		// everything went well, confirm to the backend that it did, and then we navigate back to the auditor's dashboard
		await api.post(`/visit-response/${data.ID}/complete`)
		sendBack()
	} catch (err) {
		console.error('Error submitting form:', err)
		await errorApi.log('Form submission failed: ' + err.message)
		alert('Noget gik galt: ' + err.message + ' Prøv igen.')
		// ponytail: stay on the form so formData survives, user can retry/edit and resubmit
	} finally {
		isSubmitting.value = false
	}
}

const getLocation = () => {
	console.log('getting location')
	// Fallback coordinates (e.g., a default location like Copenhagen, Denmark)
	const fallbackLocation = {
		latitude: '0',
		longitude: '0',
		accuracy: '0',
	}

	if (!navigator.geolocation) {
		//alert('Geolocation ikke understøttet')
		formData.actual_latitude = fallbackLocation.latitude
		formData.actual_longitude = fallbackLocation.longitude
		formData.pos_accuracy = fallbackLocation.accuracy
		return
	}

	if (!window.isSecureContext) {
		//alert('Geolocation kræver en sikker forbindelse (HTTPS). Fallback placering bruges.')
		formData.actual_latitude = fallbackLocation.latitude
		formData.actual_longitude = fallbackLocation.longitude
		formData.pos_accuracy = fallbackLocation.accuracy
		return
	}

	isCapturingLocation.value = true
	let bestPosition
	let watchId = null

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

		//console.log(formData.actual_latitude)
		//console.log(formData.actual_longitude)
		//console.log(formData.pos_accuracy)
	}

	watchId = navigator.geolocation.watchPosition(
		(position) => {
			if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
				bestPosition = position
				// Stop if accuracy is below 15 meters (customize as needed)
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

	// Force finish after 10 seconds to avoid infinite wait
	console.log('starting geolocation')
	setTimeout(finish, 10 * 1000)
}

// image picker in parent
function handleImageUpload(e) {
	const files = Array.from(e.target.files)
	const maxMB = 50
	const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
	files.forEach((file) => {
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
	e.target.value = '' // allow same-file reselect
}

// Revoke object URLs for removed images to avoid leaks
watch(
	() => formData.images.map((i) => i.preview),
	(nv, ov) => {
		const removed = (ov || []).filter((p) => !nv.includes(p))
		removed.forEach((p) => {
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
	const id = visitData.value.user.ID

	router.push(`/auditor/${id}`)
}
</script>
