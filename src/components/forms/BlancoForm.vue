<template>
	<div style="margin: 16px">
		<h1>Blanco</h1>
		<p>
			Dette betyder at skyldner ikke har pengene til at betale en lån som de har taget. Nu
			skal du finde ud af hvor meget man kan forvente at få ud af dem.
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
			:required="true"
		/>

		<!-- Bilen skadet? -->
		<YesNo
			label="Er der en bil til stede på adressen?"
			name="asset_at_address"
			v-model="fd.asset_at_address"
			:required="true"
		/>
		<div class="Bil-questions" v-if="fd.asset_at_address" style="margin: 30px 0">
			<!-- Bilen til stede på adressen? -->

			<label v-if="fd.asset_at_address">
				Aktuel km-stand
				<input v-model.number="fd.odometer_km" type="number" min="0" step="1" />
			</label>

			<!-- Bilen på værksted? -->
			<div
				v-if="
					!fd.asset_at_address && fd.asset_at_address != undefined && fd.debitor_is_home
				"
			>
				<label
					>Hvor er bilen lige nu? (værksted,ude og køre eller ved ikke)
					<input
						v-model.trim="fd.asset_location"
						type="text"
						placeholder="Adresse/sted"
						required
					/>
				</label>
				<label
					>Hvem kører den?
					<input
						v-model.trim="fd.asset_driver"
						type="text"
						placeholder="Navn/telefon"
						required
					/>
				</label>
			</div>

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
		</div>

		<div class="hus-questions" style="margin: 30px 0">
			<!-- ejer de huset? -->
			<!-- Bolig type -->
			<SelectField
				label="Bolig type"
				inputLabel="bolig type"
				name="boligType"
				v-model="fd.property_type"
				:options="[
					'Fritliggende',
					'Byhus',
					'Kolonihave',
					'Lejlighed',
					'Rækkehus',
					'Sommerhus',
					'Andet',
				]"
				placeholder="Vælg boligtype"
				:required="true"
			/>
			<!-- Boligen skadet? -->
			<SelectField
				label="Bolig stand"
				input-label="bolig stand"
				name="boligStand"
				v-model="fd.maintenance_status"
				:options="['Velholdt', 'Forfalden', 'Ukendt']"
				placeholder="Vælg boligstand"
				:required="true"
			/>

			<!-- Ejerforhold -->
			<SelectField
				v-if="fd.debitor_is_home"
				label="Ejerforhold"
				inputLabel="ejerforhold"
				name="ownership_status"
				v-model="fd.ownership_status"
				:options="[
					{ value: 'EjerBolig', label: 'Ejer' },
					{ value: 'LejerBolig', label: 'Lejer' },
					{ value: 'AndelsBolig', label: 'Andels' },
					{ value: 'Andet', label: 'Andet' },
				]"
				placeholder="Vælg ejerforhold"
				:required="true"
			/>
		</div>

		<div class="family" style="margin: 30px 0" v-if="fd.debitor_is_home">
			<!--Civil stand-->
			<SelectField
				label="Civil stand"
				inputLabel="Civil stand"
				name="CivilStand"
				v-model="fd.civil_status"
				:options="['Married', 'Single', 'Cohabiting', 'Andet']"
				placeholder="Vælg civil stand"
				:required="true"
			/>
			<!--Children-->
			<YesNo
				label="Har skyldner børn"
				name="has_children"
				v-model="fd.has_children"
				:required="true"
			/>
			<fieldset v-if="fd.has_children">
				<legend>Hvor mange børn under 18 år</legend>
				<input
					v-model.number="fd.children_under_18"
					type="number"
					min="0"
					step="1"
					required
				/>
			</fieldset>
		</div>

		<div class="economy" style="margin: 30px 0" v-if="fd.debitor_is_home">
			<!-- har skyldner et job? hvilket job? og hvad hvad tjener de?-->
			<YesNo
				label="Har skyldner Job?"
				name="has_job"
				v-model="fd.has_work"
				:required="true"
			/>
			<Transition name="fade-slide" appear>
				<fieldset v-if="fd.has_work">
					<legend>Hvilket job har skyldner? (hvis flere så sæt komma)</legend>
					<input v-model.trim="fd.position" type="text" placeholder="Jobtitel" required />
				</fieldset>
			</Transition>
			<Transition name="fade-slide" appear>
				<fieldset v-if="fd.has_work">
					<legend>Hvad tjener skyldner ved at arbejde?</legend>
					<input v-model.number="fd.salary" type="number" min="0" required />
				</fieldset>
			</Transition>

			<fieldset>
				<legend>
					offentlige yderlser (kontanthjælp, førtidspension, folkepension, SU, dagpenge,
					etc.)
				</legend>
				<input v-model.number="fd.income_payment" type="number" min="0" required />
			</fieldset>
			<fieldset>
				<legend>Hvad har de så at rutte med når regningerne er betalt?</legend>
				<input
					v-model.number="fd.monthly_disposable_amount"
					type="number"
					min="0"
					required
				/>
			</fieldset>

			<YesNo
				label="Har skyldner anden gæld?"
				name="has_additional_debt"
				v-model="fd.additional_debt"
				:required="true"
			/>
			<fieldset
				v-if="fd.additional_debt"
				style="
					display: grid;
					grid-template-columns: 12rem 1fr;
					align-items: center;
					gap: 0.5rem 1rem;
				"
			>
				<legend style="grid-column: 1 / -1">første gæld</legend>
				<label for="creditor">Kreditor</label>
				<input v-model.number="fd.creditor" type="text" />
				<label for="debt_amount">Gældsbeløb</label>
				<input v-model.number="fd.debt_amount" type="number" min="0" />
				<label for="settlement">Forlig (tekst)</label>
				<input v-model.number="fd.settlement" type="text" />
			</fieldset>
			<fieldset
				v-if="fd.additional_debt"
				style="
					display: grid;
					grid-template-columns: 12rem 1fr;
					align-items: center;
					gap: 0.5rem 1rem;
				"
			>
				<legend style="grid-column: 1 / -1">anden gæld</legend>
				<label for="creditor_2">Kreditor</label>
				<input v-model.number="fd.creditor_2" type="text" />
				<label for="debt_amount_2">Gældsbeløb</label>
				<input v-model.number="fd.debt_amount_2" type="number" min="0" />
				<label for="settlement_2">Forlig (tekst)</label>
				<input v-model.number="fd.settlement_2" type="text" />
			</fieldset>
		</div>

		<!-- Billeder af huset -->
		<!-- Billeder af bilen -->
		<FileUpload
			id="car-photo"
			title="Billeder af huset og andet"
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
		<br />
		<BesogsbrevButton :visit-id="props.visitData.ID" />

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

        <div class="form-section">
          <h4>Boligen</h4>
          <div class="checkbox-group">
            Bolig type
            <label for="boligType" class="checkbox-label"> bolig type</label>
            <select id="boligType" v-model="formData.property_type" class="form-select">
              <option value="Fritliggende">Fritliggende</option>
              <option value="Byhus">Byhus</option>
              <option value="Kolonihave">Kolonihave</option>
              <option value="lejlighed">Lejlighed</option>
              <option value="rækkehus">Rækkehus</option>
              <option value="sommerhus">Sommerhus</option>
            </select>
            Stand
            <label for="maintenance_status" class="checkbox-label"> bolig stand</label>
            <select
              id="maintenance_status"
              v-model="formData.maintenance_status"
              class="form-select"
            >
              <option value="god">God</option>
              <option value="dårlig">Dårlig</option>
            </select>
            ownership_status
            <label for="ownership_status" class="checkbox-label"> ejerforhold</label>
            <select id="ownership_status" v-model="formData.ownership_status" class="form-select">
              <option value="EjerBolig">Ejer</option>
              <option value="LejerBolig">Lejer</option>
              <option value="AndelsBolig">Andels</option>
            </select>
          </div>
        </div>

blanco skal man bare have penge ud.
mere personen end aktiver
hvordan ser ejendommen ud?
hvor rig er personen?
billeder af huset og haven og andet.


hvad kan debitor rutte med? hvad er deres rådigheds beløb
hvad tjener debitor? hvordan er deres økonomi. hvor mange børn? job?
har de andre aktiver/sommerhus eller noget 

hvis eksporteret, hvorfor har du ikke indfriet gælden?


potentiel afdrags ordning
--></template>

<script setup>
import BesogsbrevButton from '@/components/forms/BesogsbrevButton.vue'
import { computed, ref, watch } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'
import FileUpload from '@/components/forms/FileUpload.vue'
import SelectField from '@/components/forms/SelectField.vue'
import { renderAsync } from 'docx-preview'

const wordContainer = ref(null)

const expanded = ref(false)

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
function removeAt(index) {
	// do not mutate here; let the owner (FormView) revoke URLs
	emit('remove-image', index)
}
function onUpdateFiles(next) {
	emit('update:formData', { ...props.formData, images: next })
}

const fd = computed({
	get: () => props.formData,
	set: (v) => emit('update:formData', v),
})

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
.fade-slide-enter-from,
.fade-slide-leave-to {
	opacity: 0;
	transform: translateY(-6px);
}
.fade-slide-enter-active,
.fade-slide-leave-active {
	transition:
		opacity 0.18s ease,
		transform 0.18s ease;
}

/* Respect user settings */
@media (prefers-reduced-motion: reduce) {
	.fade-slide-enter-active,
	.fade-slide-leave-active {
		transition: none;
	}
}
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
</style>
