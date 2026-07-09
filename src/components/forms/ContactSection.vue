<!-- src/components/forms/ContactSection.vue -->
<template>
	<div class="contact-section">
		<!-- ponytail: simplified input elements using native bootstrap classes for clean styling -->
		<div class="field mb-3">
			<label class="field__label">Navn(e) på postkasse</label>
			<!-- ponytail: quick fill buttons for mailbox names using debitor names -->
			<div class="quick-fills mb-2" v-if="debitors.length">
				<button
					v-for="d in debitors"
					:key="d.ID"
					type="button"
					class="btn-badge me-1"
					@click="fd.contact.mailbox_name = d.name"
				>
					Brug: {{ d.name }}
				</button>
			</div>
			<input
				v-model="fd.contact.mailbox_name"
				type="text"
				class="form-control"
				placeholder="F.eks. Jens Jensen"
			/>
		</div>

		<YesNo
			label="Er debitor mødt?"
			name="debitor_met"
			v-model="fd.contact.debitor_met"
			:required="true"
		/>

		<Transition name="fade-slide" appear>
			<div v-if="fd.contact.debitor_met === false" class="mt-3">
				<YesNo
					label="Er andre mødt?"
					name="other_met"
					v-model="fd.contact.other_met"
					:required="true"
				/>

				<Transition name="fade-slide" appear>
					<div v-if="fd.contact.other_met" class="field mt-2 mb-3">
						<label class="field__label"
							>Hvem blev mødt? (F.eks. ægtefælle, partner, kæreste, barn, nabo)</label
						>
						<input
							v-model.trim="fd.contact.other_title"
							type="text"
							class="form-control"
							placeholder="Titel/relation"
							required
						/>
					</div>
				</Transition>
			</div>
		</Transition>

		<!-- ponytail: Only show CVR worker questions if at least one debitor is a company -->
		<template v-if="showWorkerMet">
			<YesNo
				label="Er en medarbejder mødt? (CVR)"
				name="worker_met"
				v-model="fd.contact.worker_met"
				:required="true"
				class="mt-3"
			/>

			<Transition name="fade-slide" appear>
				<div v-if="fd.contact.worker_met" class="field mt-2 mb-3">
					<label class="field__label"
						>Hvilken medarbejder blev mødt? (F.eks. direktør, receptionist,
						håndværker)</label
					>
					<input
						v-model.trim="fd.contact.worker_title"
						type="text"
						class="form-control"
						placeholder="Titel/rolle"
						required
					/>
				</div>
			</Transition>
		</template>

		<div class="field mt-3 mb-2">
			<label class="field__label">Rettet telefonnummer</label>
			<!-- ponytail: quick fill buttons for phone numbers of each debitor -->
			<div class="quick-fills mb-1" v-if="phoneDebitors.length">
				<button
					v-for="d in phoneDebitors"
					:key="d.ID"
					type="button"
					class="btn-badge me-1"
					@click="fd.contact.corrected_tlf = d.phone || d.phone_work"
				>
					Brug: {{ d.phone || d.phone_work }}
				</button>
			</div>
			<input
				v-model.trim="fd.contact.corrected_tlf"
				type="tel"
				class="form-control"
				:placeholder="phonePlaceholder"
			/>
		</div>

		<div class="field mb-3">
			<label class="field__label">Rettet e-mail</label>
			<!-- ponytail: quick fill buttons for email of each debitor -->
			<div class="quick-fills mb-1" v-if="emailDebitors.length">
				<button
					v-for="d in emailDebitors"
					:key="d.ID"
					type="button"
					class="btn-badge me-1"
					@click="fd.contact.corrected_mail = d.email"
				>
					Brug: {{ d.email }}
				</button>
			</div>
			<input
				v-model.trim="fd.contact.corrected_mail"
				type="email"
				class="form-control"
				:placeholder="emailPlaceholder"
			/>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import YesNo from '@/components/forms/YesNo.vue'

const props = defineProps({
	formData: { type: Object, required: true },
	showWorkerMet: { type: Boolean, default: false },
	debitors: { type: Array, default: () => [] },
})

const fd = computed({
	get: () => props.formData,
	set: () => {},
})

const phoneDebitors = computed(() => {
	return props.debitors.filter((d) => d.phone || d.phone_work)
})

const emailDebitors = computed(() => {
	return props.debitors.filter((d) => d.email)
})

const phonePlaceholder = computed(() => {
	const first = phoneDebitors.value[0]
	if (first) {
		return `Nuværende: ${first.phone || first.phone_work}`
	}
	return 'Nyt/rettet tlf. nummer'
})

const emailPlaceholder = computed(() => {
	const first = emailDebitors.value[0]
	if (first) {
		return `Nuværende: ${first.email}`
	}
	return 'Ny/rettet e-mailadresse'
})
</script>

<style scoped>
.contact-section {
	border-left: 3px solid #3b82f6;
	padding-left: 1rem;
	margin-bottom: 2rem;
}
.field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.field__label {
	font-size: 15px;
	font-weight: 500;
	color: var(--text);
}
.form-control {
	padding: 8px 12px;
	border: 2px solid #d1d5db;
	border-radius: 8px;
	font-size: 15px;
	background: #fff;
}
.form-control:focus {
	outline: none;
	border-color: rgb(99, 170, 219);
}
.btn-badge {
	background: #f3f4f6;
	border: 1px solid #d1d5db;
	color: #374151;
	padding: 4px 8px;
	font-size: 12px;
	font-weight: 500;
	border-radius: 6px;
	cursor: pointer;
	transition: background 0.15s;
}
.btn-badge:hover {
	background: #e5e7eb;
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
.mb-1 {
	margin-bottom: 0.25rem;
}
.mb-2 {
	margin-bottom: 0.5rem;
}
.me-1 {
	margin-right: 0.25rem;
}
</style>
