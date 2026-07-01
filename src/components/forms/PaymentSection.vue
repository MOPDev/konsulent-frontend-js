<template>
  <YesNo
    label="Er betaling modtaget?"
    name="payment_received"
    v-model="fd.payment_received"
    :required="required"
  />
  <fieldset v-if="showAmount && fd.payment_received">
    <legend>Hvor meget er betalingen på? (kr.)</legend>
    <input
      v-model.number="fd.payment_received_amount"
      type="number"
      min="0"
      required
    />
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'

const props = defineProps({
  formData: { type: Object, required: true },
  required: { type: Boolean, default: false },
  showAmount: { type: Boolean, default: false },
})

const fd = computed({
  get: () => props.formData,
  set: () => {},
})
</script>
