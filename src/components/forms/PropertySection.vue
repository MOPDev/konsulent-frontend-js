<!-- src/components/forms/PropertySection.vue -->
<template>
	<div class="property-section" style="margin: 30px 0">
		<SelectField
			label="Bolig type"
			inputLabel="bolig type"
			name="property_type"
			v-model="fd.property.property_type"
			:options="[
				'Fritlæggende hus',
				'Byhus',
				'Rækkehus',
				'Sommerhus',
				'Kolonihave',
				'Lejlighed',
			]"
			placeholder="Vælg boligtype"
			:required="true"
		/>

		<!-- ponytail: individual YesNo components for each of the new property indicators in the backend struct -->
		<YesNo
			label="Overbegroet have?"
			name="OvergrownGarden"
			v-model="fd.property.OvergrownGarden"
			class="mt-2"
		/>
		<YesNo
			label="Fyldt postkasse?"
			name="MailboxFull"
			v-model="fd.property.MailboxFull"
			class="mt-2"
		/>
		<YesNo
			label="Knuste ruder?"
			name="BrokenWindows"
			v-model="fd.property.BrokenWindows"
			class="mt-2"
		/>
		<YesNo
			label="Efterladte køretøjer?"
			name="AbandonedVehicles"
			v-model="fd.property.AbandonedVehicles"
			class="mt-2"
		/>
		<YesNo
			label="Til salg-skilt?"
			name="ForsaleSign"
			v-model="fd.property.ForsaleSign"
			class="mt-2"
		/>
		<!-- TODO: mægler osv billede  -->
	</div>
</template>

<script setup>
import { computed } from 'vue'
import SelectField from '@/components/forms/SelectField.vue'
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
.property-section {
	border-left: 3px solid #10b981;
	padding-left: 1rem;
}
.mt-2 {
	margin-top: 0.5rem;
}
</style>
