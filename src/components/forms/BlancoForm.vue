<template>
  <div class="form-wrapper">
    <FormHeader
      title="Blanco"
      description="Dette betyder at skyldner ikke har pengene til at betale en lån som de har taget. Nu skal du finde ud af hvor meget man kan forvente at få ud af dem."
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

      <PaymentSection :form-data="fd" :required="true" />

      <AssetCarSection :form-data="fd" />

      <div class="hus-questions" style="margin: 30px 0">
        <SelectField
          label="Bolig type"
          inputLabel="bolig type"
          name="boligType"
          v-model="fd.property_type"
          :options="[
            'Fritliggende',
            'Byhus',
            'Kolonihave',
            'Lejlighed',
            'Rækkehus',
            'Sommerhus',
            'Andet',
          ]"
          placeholder="Vælg boligtype"
          :required="true"
        />
        <SelectField
          label="Bolig stand"
          input-label="bolig stand"
          name="boligStand"
          v-model="fd.maintenance_status"
          :options="['Velholdt', 'Forfalden', 'Ukendt']"
          placeholder="Vælg boligstand"
          :required="true"
        />
        <SelectField
          v-if="fd.debitor_is_home"
          label="Ejerforhold"
          inputLabel="ejerforhold"
          name="ownership_status"
          v-model="fd.ownership_status"
          :options="[
            { value: 'EjerBolig', label: 'Ejer' },
            { value: 'LejerBolig', label: 'Lejer' },
            { value: 'AndelsBolig', label: 'Andels' },
            { value: 'Andet', label: 'Andet' },
          ]"
          placeholder="Vælg ejerforhold"
          :required="true"
        />
      </div>

      <div class="family" style="margin: 30px 0" v-if="fd.debitor_is_home">
        <SelectField
          label="Civil stand"
          inputLabel="Civil stand"
          name="CivilStand"
          v-model="fd.civil_status"
          :options="['Married', 'Single', 'Cohabiting', 'Andet']"
          placeholder="Vælg civil stand"
          :required="true"
        />
        <YesNo
          label="Har skyldner børn"
          name="has_children"
          v-model="fd.has_children"
          :required="true"
        />
        <fieldset v-if="fd.has_children">
          <legend>Hvor mange børn under 18 år</legend>
          <input
            v-model.number="fd.children_under_18"
            type="number"
            min="0"
            step="1"
            required
          />
        </fieldset>
      </div>

      <div class="economy" style="margin: 30px 0" v-if="fd.debitor_is_home">
        <YesNo
          label="Har skyldner Job?"
          name="has_job"
          v-model="fd.has_work"
          :required="true"
        />
        <Transition name="fade-slide" appear>
          <fieldset v-if="fd.has_work">
            <legend>Hvilket job har skyldner? (hvis flere så sæt komma)</legend>
            <input v-model.trim="fd.position" type="text" placeholder="Jobtitel" required />
          </fieldset>
        </Transition>
        <Transition name="fade-slide" appear>
          <fieldset v-if="fd.has_work">
            <legend>Hvad tjener skyldner ved at arbejde?</legend>
            <input v-model.number="fd.salary" type="number" min="0" required />
          </fieldset>
        </Transition>

        <fieldset>
          <legend>
            offentlige yderlser (kontanthjælp, førtidspension, folkepension, SU, dagpenge, etc.)
          </legend>
          <input v-model.number="fd.income_payment" type="number" min="0" required />
        </fieldset>
        <fieldset>
          <legend>Hvad har de så at rutte med når regningerne er betalt?</legend>
          <input
            v-model.number="fd.monthly_disposable_amount"
            type="number"
            min="0"
            required
          />
        </fieldset>

        <YesNo
          label="Har skyldner anden gæld?"
          name="has_additional_debt"
          v-model="fd.additional_debt"
          :required="true"
        />
        <fieldset
          v-if="fd.additional_debt"
          style="
            display: grid;
            grid-template-columns: 12rem 1fr;
            align-items: center;
            gap: 0.5rem 1rem;
          "
        >
          <legend style="grid-column: 1 / -1">første gæld</legend>
          <label for="creditor">Kreditor</label>
          <input v-model.number="fd.creditor" type="text" />
          <label for="debt_amount">Gældsbeløb</label>
          <input v-model.number="fd.debt_amount" type="number" min="0" />
          <label for="settlement">Forlig (tekst)</label>
          <input v-model.number="fd.settlement" type="text" />
        </fieldset>
        <fieldset
          v-if="fd.additional_debt"
          style="
            display: grid;
            grid-template-columns: 12rem 1fr;
            align-items: center;
            gap: 0.5rem 1rem;
          "
        >
          <legend style="grid-column: 1 / -1">anden gæld</legend>
          <label for="creditor_2">Kreditor</label>
          <input v-model.number="fd.creditor_2" type="text" />
          <label for="debt_amount_2">Gældsbeløb</label>
          <input v-model.number="fd.debt_amount_2" type="number" min="0" />
          <label for="settlement_2">Forlig (tekst)</label>
          <input v-model.number="fd.settlement_2" type="text" />
        </fieldset>
      </div>

      <FormActions
        :form-data="fd"
        :visit-id="visitData.ID"
        :is-submitting="isSubmitting"
        image-title="Billeder af huset og andet"
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
import SelectField from '@/components/forms/SelectField.vue'

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
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

@media (prefers-reduced-motion: reduce) {
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: none;
  }
}

.form-wrapper {
  width: 100%;
  margin: 0 auto;
}
</style>
