<!-- src/components/forms/LeasingForm.vue -->
<template>
	<div class="form-wrapper">
		<FormHeader
			title="Leasing"
			description="Fordi det er en leasingaftale, ejer skyldner ikke bilen. Derfor kan bilen tages/indrages uden skyldners kontrakt."
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

<script setup>
import { useVisitForm } from '@/composables/useVisitForm'
import FormHeader from '@/components/forms/FormHeader.vue'
import DebitorPanel from '@/components/forms/DebitorPanel.vue'
import ContactSection from '@/components/forms/ContactSection.vue'
import PaymentSection from '@/components/forms/PaymentSection.vue'
import AssetCarSection from '@/components/forms/AssetCarSection.vue'
import OtherAssetsSection from '@/components/forms/OtherAssetsSection.vue'
import FormActions from '@/components/forms/FormActions.vue'

const props = defineProps({
	visitData: { type: Object, required: true },
	formData: { type: Object, required: true },
	isSubmitting: { type: Boolean, default: false },
	docBlob: { type: Object, default: null },
})
const emit = defineEmits(['update:formData', 'submit', 'images', 'remove-image'])

const { fd, filteredData } = useVisitForm(props, emit)
</script>

<style scoped>
.form-wrapper {
	width: 100%;
	margin: 0 auto;
}
</style>
