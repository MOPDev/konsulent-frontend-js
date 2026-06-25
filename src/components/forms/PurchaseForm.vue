<template>
	<div style="margin: 16px">
		<h1>Købe kontrakt</h1>
		<p>
			Fordi det er en købekontrakt så ejer skyldner bilen men de har ikke betalt de penge som
			de skylder i den. prøv at få dem til at underskrive kontrakten.
		</p>
		<p>{{ filteredData?.debt?.Fordringsbeskrivelser }}</p>
		<p>{{ filteredData?.debt?.Sagsfremstillinger }}</p>
	</div>

	<div style="margin: 16px">
		<button
			class="debitor-toggle"
			@click="toggleExpanded"
			:aria-expanded="expanded ? 'true' : 'false'"
			aria-controls="debitor-panel"
		>
			<span>Debitor: {{ filteredData?.debitors?.[0]?.name ?? '—' }}</span>
		</button>

		<div v-if="expanded">
			<!-- Read-only container for the Word Doc -->
			<div v-if="docBlob" class="document-preview-wrapper">
				<div ref="wordContainer" class="docx-preview-container"></div>
			</div>
		</div>
	</div>

	<!--
  const formData = reactive({
  debitor_is_home: false,
  civil_status: '',
  payment_received: false,
  asset_at_address: false,
  asset_damaged: false,

  asset_at_workshop: false,
  asset_clean: false,
  asset_location: '',
  asset_comments: '',
  odometer_km: 0,

  has_work: false,
  position: '',
  salary: 0,
  children_under_18: 0,
  children_over_18: 0,
  comments: '',
  property_type: '',
  maintenance_status: '',
  ownership_status: '',
  actual_latitude: '',
  actual_longitude: '',
  posAccuracy: '',
  images: [],
})

  -->

	<form @submit.prevent="emit('submit')">
		<!-- debitor hjemme? -->
		<YesNo
			label="Er debitor hjemme?"
			name="debitor_is_home"
			v-model="fd.debitor_is_home"
			:required="true"
		/>

		<!-- Betaling modtaget? -->

		<YesNo
			label="Er betaling modtaget?"
			name="payment_received"
			v-model="fd.payment_received"
		/>
		<!-- Hvis betaling hvor meget? Go backend payment_received_amount -->
		<fieldset v-if="fd.payment_received">
			<legend>Hvor meget er betalingen på? (kr.)</legend>
			<input v-model.number="fd.payment_received_amount" type="number" min="0" required />
		</fieldset>

		<!-- Bilen til stede på adressen? -->
		<YesNo
			label="Er bilen til stede på adressen?"
			name="asset_at_address"
			v-model="fd.asset_at_address"
			:required="true"
		/>

		<label v-if="fd.asset_at_address">
			Aktuel km-stand
			<input v-model.number="fd.odometer_km" type="number" min="0" step="1" />
		</label>

		<!-- Bilen på værksted? -->
		<div v-if="!fd.asset_at_address && fd.asset_at_address != undefined && fd.debitor_is_home">
			<label
				>Hvor er bilen lige nu?
				<input
					v-model.trim="fd.asset_location"
					type="text"
					placeholder="værksted, ude og køre"
				/>
			</label>
			<label
				>Hvem kører den?
				<input v-model.trim="fd.asset_driver" type="text" placeholder="Navn, telefon" />
			</label>
		</div>

		<!-- Bilen skadet? -->

		<YesNo
			v-if="fd.asset_at_address || fd.debitor_is_home"
			label="Er bilen skadet?"
			name="asset_damaged"
			v-model="fd.asset_damaged"
			:required="true"
		/>

		<!-- Bilen ryddet? -->
		<YesNo
			v-if="fd.asset_at_address"
			label="Er bilen ryddet?"
			name="asset_clean"
			v-model="fd.asset_clean"
			:required="true"
		/>

		<!-- Nøgler givet/modtaget -->
		<YesNo
			label="Er nøgler givet til konsulenten?"
			name="keys_given"
			v-model="fd.keys_given"
			:required="true"
		/>

		<!-- Salgsfuldmagt/kontrakt underskrevet -->

		<YesNo
			v-if="fd.debitor_is_home"
			label="Er salgsfuldmagt underskrevet?"
			name="sf_signed"
			v-model="fd.sf_signed"
			:required="true"
		/>

		<YesNo
			v-if="fd.debitor_is_home"
			label="Er salgs-/eftergivelseaftale underskrevet?"
			name="se_signed"
			v-model="fd.se_signed"
			:required="true"
		/>

		<!-- Billeder af bilen -->
		<FileUpload
			id="car-photo"
			title="Billede af bilen og postkassen"
			hint="Tryk for at tilføje ét billede ad gangen"
			icon="📷"
			accept="image/*"
			:multiple="false"
			:append-mode="true"
			:files="formData.images"
			@images="(e) => emit('images', e)"
			@remove="removeAt"
			@update:files="onUpdateFiles"
		/>
		<BesogsbrevButton :visit-id="props.visitData.ID" />

		<br />
		<label
			>Kommentarer <br />
			<textarea
				v-model.trim="fd.comments"
				cols="50"
				rows="4"
				placeholder="Evt. noter"
			></textarea>
		</label>
		<br />
		<button type="submit" :disabled="isSubmitting">Aflever svar</button>
	</form>

	<!--
  købekontrakt tage bilen hvis underskrift (salgs fuldmagt)
  mere målrettet mod aktivet istedet for personen
  check bokse er bilen skadet? er den ryddet? hvor langt er bilen kørt lige nu?
  billeder af bilen 
  er bilen tilstede? er den på værkstedet? hvor er den lige nu? hvis ikke hjemme så hvor og hvem kører den?
  er bilen tilskade? normale spørgsmål.
  
  
  -->

	<!--
  <pre v-if="expanded" v-text="JSONData"></pre>
  -->
</template>

<script setup>
import BesogsbrevButton from '@/components/forms/BesogsbrevButton.vue'
import { computed, ref, watch } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'
import FileUpload from '@/components/forms/FileUpload.vue'
import { renderAsync } from 'docx-preview'

const expanded = ref(false)
const wordContainer = ref(null)

const toggleExpanded = () => {
	expanded.value = !expanded.value
}

const props = defineProps({
	visitData: { type: Object, required: true },
	formData: { type: Object, required: true },
	isSubmitting: { type: Boolean, default: false },
	docBlob: { type: Object, default: null }, // The blob passed from parent
})
const emit = defineEmits(['update:formData', 'submit', 'images', 'remove-image'])

function onUpdateFiles(next) {
	emit('update:formData', { ...props.formData, images: next })
}
const fd = computed({
	get: () => props.formData,
	set: (v) => emit('update:formData', v),
})
function removeAt(index) {
	// do not mutate here; let the owner (FormView) revoke URLs
	emit('remove-image', index)
}

// Watch for when the blob is loaded and then render it
watch(
	[() => props.docBlob, wordContainer],
	async ([newBlob, container]) => {
		if (newBlob && container) {
			// Clear previous content before rendering
			container.innerHTML = ''
			try {
				await renderAsync(newBlob, container)
			} catch (e) {
				console.error('docx-preview error:', e)
			}
		}
	},
	{ immediate: true },
)

function calculateAge(birthday) {
	if (!birthday) return ''
	const birthDate = new Date(birthday)
	const today = new Date()
	let age = today.getFullYear() - birthDate.getFullYear()
	const m = today.getMonth() - birthDate.getMonth()
	if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
		age--
	}
	return age
}

const filteredData = computed(() => {
	const visit = props.visitData || {}
	const debitors = (visit.debitors || []).map((d) => ({
		...d,
		age: calculateAge(d.birthday),
	}))
	return { ...visit, debitors }
})
</script>
<style scoped>
.debitor-toggle {
	background: none;
	border: 0;
	padding: 0;
	font: inherit;
	cursor: pointer;
}
.debitor-toggle::after {
	content: ' ▸'; /* closed */
}
.debitor-toggle[aria-expanded='true']::after {
	content: ' ▾'; /* open */
}
.debitor-toggle:hover {
	text-decoration: underline;
}
.docx-preview-container {
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	padding: 10px;
	background: #f9f9f9;
	height: 600px;
	overflow-y: auto;
	/* Prevent interaction */
}
/* This targets the internal docx-preview styling to make it look cleaner */
:deep(.docx-wrapper) {
	background-color: transparent !important;
	padding: 0 !important;
}
:deep(.docx) {
	box-shadow: none !important;
	margin-bottom: 0 !important;
}
</style>
