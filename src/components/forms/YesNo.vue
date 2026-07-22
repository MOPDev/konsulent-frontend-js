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

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
	label: string
	name: string
	modelValue?: boolean | null
	required?: boolean
	disabled?: boolean
	hint?: string
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: null,
	required: false,
	disabled: false,
	hint: '',
})

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean | null): void
}>()

const val = computed({
	get: () => props.modelValue,
	set: (v: boolean | null) => emit('update:modelValue', v),
})

const options = [
	{ text: 'Ja', value: true },
	{ text: 'Nej', value: false },
]
</script>
