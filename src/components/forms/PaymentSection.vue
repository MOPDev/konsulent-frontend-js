<!-- src/components/forms/PaymentSection.vue -->
<template>
	<div>
		<YesNo
			label="Er betaling modtaget?"
			name="payment_received"
			v-model="fd.payment.ReceivedPayment"
			:required="required"
		/>
		<Transition name="fade-slide" appear>
			<div v-if="showAmount && fd.payment.ReceivedPayment" class="mt-3">
				<fieldset class="mb-3">
					<legend>Hvor meget er betalingen på? (kr.)</legend>
					<input
						v-model="formattedAmount"
						type="text"
						inputmode="decimal"
						class="form-control"
						required
					/>
				</fieldset>

				<!-- ponytail: PaymentMethod select field added matching new backend struct model.PaymentQuestions -->
				<fieldset class="mb-3">
					<legend>Betalingsmetode</legend>
					<select v-model="fd.payment.PaymentMethod" class="form-select" required>
						<option value="" disabled hidden>Vælg betalingsmetode</option>
						<option value="Kontant">Kontant</option>
						<option value="Bankoverførsel">Bankoverførsel</option>
						<option value="Andet">Andet</option>
					</select>
				</fieldset>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'

const props = defineProps<{
	formData: Record<string, unknown>
	required?: boolean
	showAmount?: boolean
}>()

const fd = computed<any>({
	get: () => props.formData,
	set: () => {},
})

const formattedAmount = computed({
	get() {
		const val = fd.value.payment.PaymentAmount
		if (val === null || val === undefined || val === '') return ''
		return new Intl.NumberFormat('da-DK', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(val)
	},
	set(str: string) {
		const num = parseFloat(str.replace(/\./g, '').replace(',', '.'))
		fd.value.payment.PaymentAmount = isNaN(num) ? null : num
	},
})
</script>

<style scoped>
.form-control,
.form-select {
	padding: 8px 12px;
	border: 2px solid #d1d5db;
	border-radius: 8px;
	font-size: 15px;
	background: #fff;
	width: 100%;
}
.form-control:focus,
.form-select:focus {
	outline: none;
	border-color: rgb(99, 170, 219);
}
.mt-3 {
	margin-top: 1rem;
}
.mb-3 {
	margin-bottom: 1rem;
}
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
</style>
