<!-- src/components/forms/MoneyRangeSelector.vue -->
<template>
  <fieldset class="range-selector mb-3">
    <legend>{{ label }}</legend>

    <!-- ponytail: Danish formatted range display for quick visual scanning on tablet -->
    <div class="range-display mb-2">
      <strong>{{ formatValue(minVal) }} - {{ formatValue(maxVal) }}</strong>
    </div>

    <!-- ponytail: simple touch-friendly HTML5 range inputs stacked for mobile/tablet ease -->
    <div class="sliders-container">
      <div class="slider-row">
        <label :for="`${name}-min`" class="slider-label">Min:</label>
        <input
          :id="`${name}-min`"
          type="range"
          :min="min"
          :max="max"
          :step="step"
          v-model.number="minVal"
          class="form-range"
        />
      </div>
      <div class="slider-row mt-2">
        <label :for="`${name}-max`" class="slider-label">Maks:</label>
        <input
          :id="`${name}-max`"
          type="range"
          :min="min"
          :max="max"
          :step="step"
          v-model.number="maxVal"
          class="form-range"
        />
      </div>
    </div>

    <!-- ponytail: precise input inputs below for fallback/fine-tuning -->
    <div class="inputs-container mt-3 row">
      <div class="col">
        <input
          type="number"
          :min="min"
          :max="max"
          v-model.number="minVal"
          class="form-control"
          placeholder="Min. kr."
          required
        />
      </div>
      <div class="col">
        <input
          type="number"
          :min="min"
          :max="max"
          v-model.number="maxVal"
          class="form-control"
          placeholder="Maks. kr."
          required
        />
      </div>
    </div>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  name: { type: String, required: true },
  modelValueMin: { type: [Number, null], default: null },
  modelValueMax: { type: [Number, null], default: null },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100000 },
  step: { type: Number, default: 1000 },
})

const emit = defineEmits(['update:modelValueMin', 'update:modelValueMax'])

const minVal = computed({
  get: () => props.modelValueMin ?? props.min,
  set: (v) => {
    emit('update:modelValueMin', v)
    // Adjust max value to not be lower than min value
    if (props.modelValueMax !== null && v > props.modelValueMax) {
      emit('update:modelValueMax', v)
    }
  },
})

const maxVal = computed({
  get: () => props.modelValueMax ?? props.max,
  set: (v) => {
    emit('update:modelValueMax', v)
    // Adjust min value to not be higher than max value
    if (props.modelValueMin !== null && v < props.modelValueMin) {
      emit('update:modelValueMin', v)
    }
  },
})

function formatValue(val) {
  if (val === null || val === undefined) return '0 kr.'
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(val)
}
</script>

<style scoped>
.range-selector {
  border-left: 3px solid #f59e0b;
  padding-left: 1rem;
  margin: 1.5rem 0;
}
.range-display {
  font-size: 1.1rem;
  color: #d97706;
}
.sliders-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.slider-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.slider-label {
  width: 3rem;
  font-weight: 500;
}
.form-range {
  flex: 1;
  height: 1.5rem;
  cursor: pointer;
}
.inputs-container {
  display: flex;
  gap: 1rem;
}
.col {
  flex: 1;
}
.form-control {
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  background: #fff;
  width: 100%;
}
.form-control:focus {
  outline: none;
  border-color: rgb(99, 170, 219);
}
.mt-2 {
  margin-top: 0.5rem;
}
.mt-3 {
  margin-top: 1rem;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.mb-3 {
  margin-bottom: 1rem;
}
</style>
