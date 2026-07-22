<!-- src/components/forms/SelectField.vue -->
<template>
	<fieldset class="select-field">
		<legend>{{ label }}</legend>

		<!-- Keeping a separate label to match your existing markup/classes -->
		<label :for="id" class="checkbox-label">{{ inputLabel || label }}</label>

		<select
			:id="id"
			class="form-select"
			:name="name"
			v-model="val"
			:required="required && (val === null || val === '')"
			:disabled="disabled"
		>
			<option v-if="placeholder" value="" disabled hidden>
				{{ placeholder }}
			</option>

			<option v-for="opt in normalizedOptions" :key="opt.value" :value="opt.value">
				{{ opt.label }}
			</option>
		</select>
	</fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SelectOption = string | { value: string | number; label: string }

interface Props {
	label: string
	name: string
	modelValue?: string | number | boolean | null
	required?: boolean
	disabled?: boolean
	options: SelectOption[]
	placeholder?: string
	inputLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: null,
	required: false,
	disabled: false,
	placeholder: '',
	inputLabel: '',
})

const emit = defineEmits<{
	(e: 'update:modelValue', value: string | number | boolean | null): void
}>()

const val = computed({
	get: () => props.modelValue,
	set: (v: string | number | boolean | null) => emit('update:modelValue', v),
})

const id = `${props.name}-select`

const normalizedOptions = computed(() =>
	props.options.map((o: SelectOption) => (typeof o === 'string' ? { value: o, label: o } : o)),
)
</script>

<style scoped>
/* Optional: reuse your existing classes or add minor tweaks here */
.select-field {
	margin: 0 0 1rem 0;
}
</style>
