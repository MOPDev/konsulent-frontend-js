<!-- src/components/forms/AssetCarSection.vue -->
<template>
	<div>
		<YesNo
			label="Er bilen til stede på adressen?"
			name="asset_seen"
			v-model="fd.assets.asset_seen"
			:required="true"
		/>

		<Transition name="fade-slide" appear>
			<div v-if="fd.assets.asset_seen" class="mt-3">
				<YesNo
					label="Er bilen tilgængelig?"
					name="asset_accessible"
					v-model="fd.assets.asset_accessible"
					:required="true"
				/>

				<fieldset class="mb-3 mt-3">
					<legend>Aktuel km-stand</legend>
					<input
						v-model.number="fd.assets.odometer_km"
						type="number"
						min="0"
						step="1"
						class="form-control"
					/>
				</fieldset>

				<!-- ponytail: Asset status select dropdown mapping to models.AssetQuestions.AssetStatus string -->
				<fieldset class="mb-3">
					<legend>Bilens stand</legend>
					<select v-model="fd.assets.asset_status" class="form-select" required>
						<option value="" disabled hidden>Vælg stand</option>
						<option value="Perfect">Perfekt (Perfect)</option>
						<option value="minor scratches">Mindre ridser (minor scratches)</option>
						<option value="beaten up">Brugt/skrammet (beaten up)</option>
						<option value="Totaled">Totalskadet (Totaled)</option>
					</select>
				</fieldset>

				<fieldset
					class="mb-3"
					v-if="fd.assets.asset_status && fd.assets.asset_status !== 'Perfect'"
				>
					<legend>Uddybende bemærkning til stand/skader</legend>
					<input
						v-model.trim="fd.assets.asset_status_note"
						type="text"
						class="form-control"
						placeholder="Beskriv skaderne"
					/>
				</fieldset>

				<!-- ponytail: Asset cleanliness select dropdown mapping to models.AssetQuestions.AssetCleanliness string -->
				<fieldset class="mb-3">
					<legend>Bilens renlighed</legend>
					<select v-model="fd.assets.asset_cleanliness" class="form-select" required>
						<option value="" disabled hidden>Vælg renlighed</option>
						<option value="lige ud af vaskehal">Lige ud af vaskehal</option>
						<option value="generelt ren">Generelt ren</option>
						<option value="jord og mudder/beskidt">Jord og mudder/beskidt</option>
					</select>
				</fieldset>

				<fieldset class="mb-3">
					<legend>Uddybende bemærkning til renlighed</legend>
					<input
						v-model.trim="fd.assets.asset_cleanliness_note"
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
			name="asset_confirmed_owner"
			v-model="fd.assets.asset_confirmed_owner"
			class="mt-3"
		/>

		<YesNo
			label="Er nøgler givet til konsulenten?"
			name="asset_keys_delivered"
			v-model="fd.assets.asset_keys_delivered"
			:required="true"
			class="mt-3"
		/>

		<YesNo
			label="Er bilen taget med / inddrevet?"
			name="is_seized"
			v-model="fd.assets.is_seized"
			:required="true"
			class="mt-3"
		/>

		<Transition name="fade-slide" appear>
			<div v-if="fd.assets.is_seized" class="mt-3">
				<!-- ponytail: HandoverStrategy select dropdown mapping to models.AssetQuestions.HandoverStrategy -->
				<fieldset class="mb-3">
					<legend>Afhentnings-/afleveringsstrategi</legend>
					<select v-model="fd.assets.handover_strategy" class="form-select" required>
						<option value="" disabled hidden>Vælg strategi</option>
						<option value="Auditor Drive-Away">
							Konsulent kører bilen væk
							<!-- (Auditor Drive-Away) -->
						</option>
						<option value="Immediate Towing">
							Akut bjærgning/bugsering
							<!-- (Immediate Towing) -->
						</option>
						<option value="Leave On Site Locked">
							Efterladt låst på stedet
							<!-- (Leave On Site Locked) -->
						</option>
						<option value="Other">Andet (Other)</option>
					</select>
				</fieldset>

				<fieldset class="mb-3" v-if="fd.assets.handover_strategy === 'Other'">
					<legend>Uddyb strategien</legend>
					<input
						v-model.trim="fd.assets.handover_strategy_note"
						type="text"
						class="form-control"
						placeholder="Beskriv aftalen"
						required
					/>
				</fieldset>

				<!-- ponytail: TransportProvider select dropdown mapping to models.AssetQuestions.TransportProvider -->
				<fieldset class="mb-3">
					<legend>Transportør/udbyder</legend>
					<select v-model="fd.assets.transport_provider" class="form-select" required>
						<option value="" disabled hidden>Vælg transportør</option>
						<option value="Grube (Sjælland)">Grube (Sjælland)</option>
						<option value="Jens (Jylland)">Jens (Jylland)</option>
						<option value="Auditor">Konsulent (Auditor)</option>
						<option value="None">Ingen (None)</option>
						<option value="Other">Anden transportør (Other)</option>
					</select>
				</fieldset>
			</div>
		</Transition>

		<!-- ponytail: Final vehicle location select dropdown mapping to models.AssetQuestions.FinalVehicleLocation -->
		<fieldset class="mb-3 mt-3">
			<legend>Endelig placering af bil</legend>
			<select v-model="fd.assets.final_vehicle_location" class="form-select" required>
				<option value="" disabled hidden>Vælg placering</option>
				<option value="Towing Storage Yard (Sjælland)">
					Opbevaringsplads Sjælland
					<!-- (Towing Storage Yard) -->
				</option>
				<option value="Towing Storage Yard (Jylland)">
					Opbevaringsplads Jylland
					<!-- (Towing Storage Yard) -->
				</option>
				<option value="Local Dealership">
					Lokal forhandler
					<!-- (Local Dealership) -->
				</option>
				<option value="At Debtor Address">
					På skyldners adresse
					<!-- (At Debtor Address) -->
				</option>
				<option value="Other">
					Andet
					<!-- (Other) -->
				</option>
			</select>
		</fieldset>

		<fieldset class="mb-3">
			<legend>Uddyb placering (f.eks. GPS, båsnummer, nøgleboks)</legend>
			<textarea
				v-model.trim="fd.assets.final_vehicle_location_note"
				rows="3"
				class="form-control"
				placeholder="F.eks. Parkeres i bås 42, nøgler i postkasse..."
			></textarea>
		</fieldset>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'

const props = defineProps({
	formData: { type: Object, required: true },
})

const fd = computed({
	get: () => props.formData,
	set: () => {},
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
