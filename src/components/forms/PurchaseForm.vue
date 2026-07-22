<!-- src/components/forms/PurchaseForm.vue -->
<template>
	<div class="form-wrapper">
		<FormHeader
			title="Købekontrakt"
			description="Fordi det er en købekontrakt, ejer skyldner bilen, men har ikke betalt restancen. Prøv at få dem til at underskrive salgsfuldmagten."
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

			<PaymentSection :form-data="fd" :show-amount="true" />

			<AssetCarSection :form-data="fd" />

			<!-- ponytail: Add OtherAssetsSection to allow registering other assets/cars found during visit -->
			<OtherAssetsSection :form-data="fd" />

			<!-- ponytail: sf_signed is mapped to fd.assets.sf_signed, and se_signed is removed as it's no longer in models.AssetQuestions -->
			<YesNo
				v-if="fd.contact.debitor_met"
				label="Er salgsfuldmagt (SF) underskrevet?"
				name="sf_signed"
				v-model="fd.asset.sf_signed"
				:required="true"
				class="mt-3"
			/>

			<PropertySection :form-data="fd" />

			<FormActions
				:form-data="fd"
				:visit-id="visitData.ID"
				:is-submitting="isSubmitting"
				image-title="Billede af bilen og postkassen"
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
import FormActions from '@/components/forms/FormActions.vue'
import YesNo from '@/components/forms/YesNo.vue'
import type { VisitWithDebitors } from '@/api/visits'

const props = defineProps<{
	visitData: VisitWithDebitors
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
.mt-3 {
	margin-top: 1rem;
}
</style>
