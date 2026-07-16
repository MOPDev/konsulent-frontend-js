<!-- src/components/forms/YesNo.vue -->
<template>
	<fieldset class="yn">
		<legend>{{ label }}</legend>
		<!-- add small hint -->
		<p class="form-text text-muted" style="margin: 0" v-if="hint">
			{{ hint }}
		</p>

		<BFormRadioGroup
			:id="`${name}-group`"
			v-model="val"
			:options="options"
			:name="name"
			:disabled="disabled"
			:required="required"
			buttons
			button-variant="outline-primary"
			size="lg"
		/>
	</fieldset>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	label: { type: String, required: true },
	name: { type: String, required: true }, // must be unique per question
	modelValue: { type: [Boolean, null], default: null }, // allow null until user chooses
	required: { type: Boolean, default: false },
	disabled: { type: Boolean, default: false },
	hint: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const val = computed({
	get: () => props.modelValue,
	set: (v) => emit('update:modelValue', v),
})

const options = [
	{ text: 'Ja', value: true },
	{ text: 'Nej', value: false },
]
</script>
