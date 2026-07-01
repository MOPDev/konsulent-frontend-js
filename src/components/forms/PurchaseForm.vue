<template>
  <div class="form-wrapper">
    <FormHeader
      title="Købe kontrakt"
      description="Fordi det er en købekontrakt så ejer skyldner bilen men de har ikke betalt de penge som de skylder i den. prøv at få dem til at underskrive kontrakten."
      :debt="filteredData?.debt"
    />
    <DebitorPanel
      :debitor-name="filteredData?.debitors?.[0]?.name ?? '—'"
      :doc-blob="docBlob"
    />
    <form @submit.prevent="emit('submit')">
      <YesNo
        label="Er debitor hjemme?"
        name="debitor_is_home"
        v-model="fd.debitor_is_home"
        :required="true"
      />

      <PaymentSection :form-data="fd" :show-amount="true" />

      <AssetCarSection :form-data="fd" />

      <YesNo
        v-if="fd.debitor_is_home"
        label="Er salgsfuldmagt underskrevet?"
        name="sf_signed"
        v-model="fd.sf_signed"
        :required="true"
      />

      <YesNo
        v-if="fd.debitor_is_home"
        label="Er salgs-/eftergivelseaftale underskrevet?"
        name="se_signed"
        v-model="fd.se_signed"
        :required="true"
      />

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
import PaymentSection from '@/components/forms/PaymentSection.vue'
import AssetCarSection from '@/components/forms/AssetCarSection.vue'
import FormActions from '@/components/forms/FormActions.vue'
import YesNo from '@/components/forms/YesNo.vue'

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
