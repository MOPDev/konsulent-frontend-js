<!-- src/components/forms/PropertySection.vue -->
<template>
	<div class="property-section" style="margin: 30px 0">
		<SelectField
			label="Bolig type"
			inputLabel="bolig type"
			name="property_type"
			v-model="fd.property.property_type"
			:options="[
				'Fritlæggende hus',
				'Byhus',
				'Rækkehus',
				'Sommerhus',
				'Kolonihave',
				'Lejlighed',
			]"
			placeholder="Vælg boligtype"
			:required="true"
		/>

		<fieldset class="mb-3 mt-2">
			<legend>Iagttagelser / bemærkning til ejendom</legend>
			<div class="quick-fills mb-2">
				<button
					v-for="t in quickFills"
					:key="t.tag"
					type="button"
					class="btn-badge me-1"
					:class="{ active: fd.property[t.field] }"
					@click="toggleTag(t)"
				>
					{{ t.tag }}
				</button>
			</div>
			<div v-if="fd.property.ForsaleSign" class="form-text mb-2">
				⚠️ Husk at notere mægler/sælger i bemærkningen, så kontoret kan finde annoncen.
			</div>

			<textarea
				v-model="fd.property.note"
				class="form-control"
				rows="2"
				placeholder="Skriv evt. bemærkning..."
				@input="syncFromNote"
			></textarea>
		</fieldset>
		<!-- TODO: mægler osv billede  -->
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SelectField from '@/components/forms/SelectField.vue'

interface QuickFill {
	tag: string
	field: string
}

const props = defineProps<{
	formData: Record<string, unknown>
}>()

const fd = computed<any>({
	get: () => props.formData,
	set: () => {},
})

const quickFills: QuickFill[] = [
	{ tag: 'overbegroet have', field: 'overgrown_garden' },
	{ tag: 'fyldt postkasse', field: 'mailbox_full' },
	{ tag: 'knuste ruder', field: 'broken_windows' },
	{ tag: 'efterladte køretøjer', field: 'abandoned_vehicles' },
	{ tag: 'overfyldt affald', field: 'trash_overflown' },
	{ tag: 'til salg-skilt', field: 'forsale_sign' },
	{ tag: 'Pænt vedligeholdt', field: 'well_maintained' },
]

function splitNote(note: string): string[] {
	return (note || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
}

function toggleTag(t: QuickFill) {
	const parts = splitNote(fd.value.property.note)
	const has = fd.value.property[t.field]

	fd.value.property[t.field] = !has

	if (!has) {
		if (!parts.includes(t.tag)) parts.push(t.tag)
	} else {
		const i = parts.indexOf(t.tag)
		if (i !== -1) parts.splice(i, 1)
	}
	fd.value.property.note = parts.length ? parts.join(', ') + ', ' : ''
}

function syncFromNote() {
	const parts = splitNote(fd.value.property.note)
	for (const t of quickFills) {
		fd.value.property[t.field] = parts.includes(t.tag)
	}
}
</script>

<style scoped>
.property-section {
	border-left: 3px solid #10b981;
	padding-left: 1rem;
}
.mt-2 {
	margin-top: 0.5rem;
}
.btn-badge.active {
	background: #10b981;
	color: #fff;
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
</style>
