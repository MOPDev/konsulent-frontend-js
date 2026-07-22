<!-- src/components/forms/BlancoForm.vue -->
<template>
	<div class="form-wrapper">
		<FormHeader
			title="Blanco"
			description="Skyldner har optaget et lån uden sikkerhedsstillelse. Afdæk skyldners nuværende livs- og økonomiske situation."
			:debt="filteredData?.debt"
		/>
		<DebitorPanel
			:debitor-name="filteredData?.debitors?.[0]?.name ?? '—'"
			:doc-blob="docBlob"
		/>
		<form @submit.prevent="emit('submit')">
			<!-- ponytail: Pass show-worker-met computed from debitors list to ContactSection -->
			<ContactSection
				:form-data="fd"
				:show-worker-met="filteredData?.debitors?.some((d) => d.is_company)"
				:debitors="filteredData?.debitors || []"
			/>

			<PaymentSection :form-data="fd" :required="true" />

			<AssetCarSection :form-data="fd" />

			<!-- ponytail: Add OtherAssetsSection to allow registering other assets/cars found during visit -->
			<OtherAssetsSection :form-data="fd" />

			<PropertySection :form-data="fd" />

			<!-- ponytail: family questions mapped to fd.monetary and debitor_met -->
			<div class="family" style="margin: 30px 0" v-if="fd.contact.debitor_met">
				<SelectField
					label="Civilstand"
					inputLabel="Civilstand"
					name="CivilStand"
					v-model="fd.monetary.civil_status"
					:options="['Married', 'Single', 'Cohabiting']"
					placeholder="Vælg civilstand"
					:required="true"
				/>

				<fieldset class="mb-3">
					<legend>Børn under 18 år (antal)</legend>
					<input
						v-model.number="fd.monetary.children_under_18"
						type="number"
						min="0"
						step="1"
						class="form-control"
						required
					/>
				</fieldset>

				<fieldset class="mb-3">
					<legend>Børn over 18 år (antal, hjemmeboende)</legend>
					<input
						v-model.number="fd.monetary.children_over_18"
						type="number"
						min="0"
						step="1"
						class="form-control"
						required
					/>
				</fieldset>
			</div>

			<!-- ponytail: economy questions mapped to fd.monetary min/max values and debt_amount_paid -->
			<div class="economy" style="margin: 30px 0" v-if="fd.contact.debitor_met">
				<YesNo
					label="Har skyldner job?"
					name="has_job"
					v-model="fd.monetary.has_work"
					:required="true"
				/>

				<Transition name="fade-slide" appear>
					<div v-if="fd.monetary.has_work" class="mt-3">
						<fieldset class="mb-3">
							<legend>Jobtitel</legend>
							<input
								v-model.trim="fd.monetary.position"
								type="text"
								class="form-control"
								placeholder="F.eks. Tømrer, Pædagog"
								required
							/>
						</fieldset>

						<!-- ponytail: replace min/max inputs with MoneyRangeSelector for tablet-friendly slider UI -->
						<MoneyRangeSelector
							label="Månedsløn (Netto, kr.)"
							name="net_salary"
							v-model:modelValueMin="fd.monetary.net_salary_min"
							v-model:modelValueMax="fd.monetary.net_salary_max"
							:min="0"
							:max="100000"
							:step="1000"
						/>
					</div>
				</Transition>

				<!-- ponytail: replace min/max inputs with MoneyRangeSelector for tablet-friendly slider UI -->
				<MoneyRangeSelector
					label="Offentlige ydelser (kontanthjælp, pension, SU osv., kr.)"
					name="income_payment"
					v-model:modelValueMin="fd.monetary.income_payment_min"
					v-model:modelValueMax="fd.monetary.income_payment_max"
					:min="0"
					:max="50000"
					:step="1000"
				/>

				<!-- ponytail: replace min/max inputs with MoneyRangeSelector for tablet-friendly slider UI -->
				<MoneyRangeSelector
					label="Månedligt rådighedsbeløb efter faste udgifter (kr.)"
					name="monthly_disposable"
					v-model:modelValueMin="fd.monetary.monthly_disposable_min"
					v-model:modelValueMax="fd.monetary.monthly_disposable_max"
					:min="0"
					:max="50000"
					:step="1000"
				/>

				<fieldset class="mb-3">
					<legend>Anden gæld der afdrages på om måneden (kr.)</legend>
					<input
						v-model.number="fd.monetary.debt_amount_paid"
						type="number"
						min="0"
						class="form-control"
						placeholder="Afdrag pr. md."
						required
					/>
				</fieldset>
			</div>

			<FormActions
				:form-data="fd"
				:visit-id="visitData.ID"
				:is-submitting="isSubmitting"
				image-title="Billeder af huset og andet"
				@images="(e) => emit('images', e)"
				@remove-image="(i) => emit('remove-image', i)"
			/>
		</form>
	</div>
</template>

<script setup lang="ts">
import { useVisitForm } from '@/composables/useVisitForm'
import FormHeader from '@/components/forms/FormHeader.vue'
import DebitorPanel from '@/components/forms/DebitorPanel.vue'
import ContactSection from '@/components/forms/ContactSection.vue'
import PaymentSection from '@/components/forms/PaymentSection.vue'
import AssetCarSection from '@/components/forms/AssetCarSection.vue'
import OtherAssetsSection from '@/components/forms/OtherAssetsSection.vue'
import PropertySection from '@/components/forms/PropertySection.vue'
import MoneyRangeSelector from '@/components/forms/MoneyRangeSelector.vue'
import FormActions from '@/components/forms/FormActions.vue'
import YesNo from '@/components/forms/YesNo.vue'
import SelectField from '@/components/forms/SelectField.vue'

const props = defineProps<{
	visitData: any
	formData: any
	isSubmitting?: boolean
	docBlob?: any
}>()
const emit = defineEmits<{
	(e: 'update:formData', val: any): void
	(e: 'submit'): void
	(e: 'images', val: any): void
	(e: 'remove-image', index: number): void
}>()

const { fd, filteredData } = useVisitForm(props, emit)
</script>

<style scoped>
.form-wrapper {
	width: 100%;
	margin: 0 auto;
}
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
.row {
	display: flex;
	gap: 1rem;
}
.col {
	flex: 1;
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
