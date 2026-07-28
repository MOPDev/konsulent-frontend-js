<!-- src/components/forms/AssetCarSection.vue -->
<template>
	<div>
		<YesNo
			label="Er bilen til stede på adressen?"
			name="asset_seen"
			v-model="fd.asset.asset_seen"
			:required="true"
		/>

		<Transition name="fade-slide" appear>
			<div v-if="fd.asset.asset_seen" class="mt-3">
				<YesNo
					label="Kan man komme til bilen?"
					name="asset_accessible"
					v-model="fd.asset.asset_accessible"
					:required="true"
				/>

				<!-- ponytail: Asset status select dropdown mapping to models.AssetQuestions.AssetStatus string -->
				<fieldset class="mb-3">
					<legend>Bilens stand</legend>
					<select v-model="fd.asset.asset_status" class="form-select" required>
						<option value="" disabled hidden>Vælg stand</option>
						<option value="Perfekt">Perfekt</option>
						<option value="Mindre ridser">Mindre ridser</option>
						<option value="Brugt/skrammet">Brugt/skrammet</option>
						<option value="Totalskadet">Totalskadet</option>
					</select>
				</fieldset>

				<fieldset
					class="mb-3"
					v-if="fd.asset.asset_status && fd.asset.asset_status !== 'Perfect'"
				>
					<legend>Evt. Uddybende bemærkning til stand/skader</legend>
					<input
						v-model.trim="fd.asset.asset_status_note"
						type="text"
						class="form-control"
						placeholder="Beskriv skaderne"
					/>
				</fieldset>

				<!-- ponytail: Asset cleanliness select dropdown mapping to models.AssetQuestions.AssetCleanliness string -->
				<fieldset class="mb-3">
					<legend>Bilens renlighed</legend>
					<select v-model="fd.asset.asset_cleanliness" class="form-select" required>
						<option value="" disabled hidden>Vælg renlighed</option>
						<option value="lige ud af vaskehal">Lige ud af vaskehal</option>
						<option value="generelt ren">Generelt ren</option>
						<option value="jord og mudder/beskidt">Jord og mudder/beskidt</option>
					</select>
				</fieldset>

				<fieldset class="mb-3">
					<legend>Evt. Uddybende bemærkning til renlighed</legend>
					<div class="quick-fills mb-2">
						<button
							v-for="t in ['røglugt', 'mug', 'beskidte sæder']"
							:key="t"
							type="button"
							class="btn-badge me-1"
							@click="
								fd.asset.asset_cleanliness_note = fd.asset.asset_cleanliness_note
									? fd.asset.asset_cleanliness_note + ', ' + t
									: t
							"
						>
							{{ t }}
						</button>
					</div>

					<input
						v-model.trim="fd.asset.asset_cleanliness_note"
						type="text"
						class="form-control"
						placeholder="F.eks. Røglugt, beskidte sæder"
					/>
				</fieldset>
			</div>
		</Transition>

		<!-- ponytail: check if debitor_met or other_met is true to show asset owner confirmation -->
		<YesNo
			v-if="fd.contact.debitor_met || fd.contact.other_met"
			label="Bekræftet ejerforhold?"
			hint="Er det bekræftet, at bilen tilhører skyldneren?"
			name="asset_confirmed_owner"
			v-model="fd.asset.asset_confirmed_owner"
			class="mt-3"
		/>

		<YesNo
			label="Er nøgler givet til konsulenten?"
			name="asset_keys_delivered"
			v-model="fd.asset.asset_keys_delivered"
			:required="true"
			class="mt-3"
		/>

		<YesNo
			label="Er bilen taget med / inddrevet?"
			name="is_seized"
			v-model="fd.asset.is_seized"
			:required="true"
			class="mt-3"
		/>

		<Transition name="fade-slide" appear>
			<div v-if="fd.asset.is_seized" class="mt-3">
				<fieldset class="mb-3 mt-3">
					<legend>Aktuel km-stand</legend>
					<input
						v-model="formattedOdometer"
						type="text"
						inputmode="numeric"
						class="form-control"
					/>
				</fieldset>

				<!-- ponytail: HandoverStrategy select dropdown mapping to models.AssetQuestions.HandoverStrategy -->
				<fieldset class="mb-3">
					<legend>Afhentnings-/afleveringsstrategi</legend>
					<select v-model="fd.asset.handover_strategy" class="form-select" required>
						<option value="" disabled hidden>Vælg strategi</option>
						<option value="Konsulent kører bilen væk">
							Konsulent kører bilen væk
							<!-- (Auditor Drive-Away) -->
						</option>
						<option value="Akut bjærgning/bugsering">
							Akut bjærgning/bugsering
							<!-- (Immediate Towing) -->
						</option>
						<option value="Efterladt låst på stedet">
							Efterladt låst på stedet
							<!-- (Leave On Site Locked) -->
						</option>
						<option value="Andet">Andet (Other)</option>
					</select>
				</fieldset>

				<fieldset class="mb-3" v-if="fd.asset.handover_strategy === 'Other'">
					<legend>Uddyb strategien</legend>
					<input
						v-model.trim="fd.asset.handover_strategy_note"
						type="text"
						class="form-control"
						placeholder="Beskriv aftalen"
						required
					/>
				</fieldset>

				<!-- ponytail: TransportProvider select dropdown mapping to models.AssetQuestions.TransportProvider -->
				<fieldset class="mb-3">
					<legend>Transportør/udbyder</legend>
					<select v-model="fd.asset.transport_provider" class="form-select" required>
						<option value="" disabled hidden>Vælg transportør</option>
						<option value="Grube (Sjælland)">Grube (Sjælland)</option>
						<option value="John Baja Transport (Jylland)">
							John Baja Transport (Jylland)
						</option>
						<option value="Konsulent">Konsulent (Auditor)</option>
						<option value="Ingen">Ingen (None)</option>
						<option value="Anden transportør">Anden transportør (Other)</option>
					</select>
				</fieldset>

				<!-- ponytail: Final vehicle location select dropdown mapping to models.AssetQuestions.FinalVehicleLocation -->
				<fieldset class="mb-3 mt-3">
					<legend>Endelig placering af bil</legend>
					<select v-model="fd.asset.final_vehicle_location" class="form-select" required>
						<option value="" disabled hidden>Vælg placering</option>
						<option value="Opbevaringsplads Sjælland">
							Opbevaringsplads Sjælland
							<!-- (Towing Storage Yard) -->
						</option>
						<option value="Opbevaringsplads Jylland">
							Opbevaringsplads Jylland
							<!-- (Towing Storage Yard) -->
						</option>
						<option value="Lokal forhandler">
							Lokal forhandler
							<!-- (Local Dealership) -->
						</option>
						<option value="På skyldners adresse">
							På skyldners adresse
							<!-- (At Debtor Address) -->
						</option>
						<option value="Andet">
							Andet
							<!-- (Other) -->
						</option>
					</select>
				</fieldset>

				<fieldset class="mb-3">
					<legend>Uddyb placering (f.eks. GPS, båsnummer, nøgleboks)</legend>
					<textarea
						v-model.trim="fd.asset.final_vehicle_location_note"
						rows="3"
						class="form-control"
						placeholder="F.eks. Parkeres i bås 42, nøgler i postkasse..."
					></textarea>
				</fieldset>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'

const props = defineProps<{
	formData: Record<string, unknown>
}>()

const fd = computed<any>({
	get: () => props.formData,
	set: () => {},
})

const formattedOdometer = computed({
	get() {
		const val = fd.value.asset.odometer_km
		if (val === null || val === undefined || val === '') return ''
		return new Intl.NumberFormat('da-DK').format(val)
	},
	set(str: string) {
		const num = parseInt(str.replace(/\./g, ''), 10)
		fd.value.asset.odometer_km = isNaN(num) ? null : num
	},
})
</script>

<style scoped>
.form-control,
.form-select {
	padding: 8px 12px;
	border: 2px solid #d1d5db;
	border-radius: 8px;
	font-size: 15px;
	background: #fff;
	width: 100%;
}
.form-control:focus,
.form-select:focus {
	outline: none;
	border-color: rgb(99, 170, 219);
}
.btn-badge {
	background: #f3f4f6;
	border: 1px solid #d1d5db;
	color: #374151;
	padding: 4px 8px;
	font-size: 12px;
	font-weight: 500;
	border-radius: 6px;
	cursor: pointer;
	transition: background 0.15s;
}
.btn-badge:hover {
	background: #e5e7eb;
}
.mt-3 {
	margin-top: 1rem;
}
.mb-3 {
	margin-bottom: 1rem;
}
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
</style>
