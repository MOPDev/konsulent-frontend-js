<template>
  <YesNo
    label="Er bilen til stede på adressen?"
    name="asset_at_address"
    v-model="fd.asset_at_address"
    :required="true"
  />

  <label v-if="fd.asset_at_address">
    Aktuel km-stand
    <input v-model.number="fd.odometer_km" type="number" min="0" step="1" />
  </label>

  <div
    v-if="
      !fd.asset_at_address &&
      fd.asset_at_address != undefined &&
      fd.debitor_is_home
    "
  >
    <label>
      Hvor er bilen lige nu? (værksted,ude og køre)
      <input v-model.trim="fd.asset_location" type="text" placeholder="Adresse/sted" required />
    </label>
    <label>
      Hvem kører den?
      <input v-model.trim="fd.asset_driver" type="text" placeholder="Navn/telefon" required />
    </label>
  </div>

  <YesNo
    v-if="fd.asset_at_address || fd.debitor_is_home"
    label="Er bilen skadet?"
    name="asset_damaged"
    v-model="fd.asset_damaged"
    :required="true"
  />

  <YesNo
    v-if="fd.asset_at_address"
    label="Er bilen ryddet?"
    name="asset_clean"
    v-model="fd.asset_clean"
    :required="true"
  />

  <div v-if="showAssetComments">
    <label>Kommentarer til aktivet</label>
    <br />
    <textarea
      v-model.trim="fd.asset_comments"
      cols="50"
      rows="4"
      placeholder="Evt. noter"
    ></textarea>
  </div>

  <YesNo
    label="Er nøgler givet til konsulenten?"
    name="keys_given"
    v-model="fd.keys_given"
    :required="true"
  />
</template>

<script setup>
import { computed } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'

const props = defineProps({
  formData: { type: Object, required: true },
  showAssetComments: { type: Boolean, default: false },
})

const fd = computed({
  get: () => props.formData,
  set: () => {},
})
</script>
