<!-- src/components/forms/OtherAssetsSection.vue -->
<template>
	<div class="other-assets-section" style="margin: 30px 0">
		<legend>Andre køretøjer / aktiver</legend>
		<p class="text-muted">
			Tilføj registreringsnummer på andre biler eller aktiver, der blev observeret under
			besøget.
		</p>

		<div v-for="(asset, index) in fd.other_assets" :key="index" class="asset-item mb-2">
			<div class="row align-items-center">
				<div class="col">
					<input
						v-model="asset.regnr"
						type="text"
						class="form-control"
						placeholder="Registreringsnummer (f.eks. AB 12 345)"
						required
					/>
				</div>
				<div class="col-auto">
					<button type="button" @click="removeAsset(index)" class="btn btn-danger">
						Fjern
					</button>
				</div>
			</div>
			<FileUpload
				:id="`other-asset-photo-${index}`"
				title="Billede af aktiv"
				hint="Tryk for at tilføje ét billede"
				:multiple="false"
				:append-mode="false"
				:files="asset.image ? [asset.image] : []"
				@update:files="(next) => (asset.image = next[0] || null)"
				@remove="() => (asset.image = null)"
			/>
		</div>

		<button type="button" @click="addAsset" class="btn btn-secondary mt-2">
			+ Tilføj andet aktiv
		</button>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import FileUpload from '@/components/forms/FileUpload.vue'

const props = defineProps({
	formData: { type: Object, required: true },
})

const fd = computed({
	get: () => props.formData,
	set: () => {},
})

if (!fd.value.other_assets) {
	fd.value.other_assets = []
}

function addAsset() {
	fd.value.other_assets.push({ regnr: '', image: null })
}

function removeAsset(index) {
	fd.value.other_assets.splice(index, 1)
}
</script>

<style scoped>
.other-assets-section {
	border-left: 3px solid #8b5cf6;
	padding-left: 1rem;
}
.asset-item {
	margin-bottom: 0.5rem;
}
.row {
	display: flex;
	gap: 1rem;
	align-items: center;
}
.col {
	flex: 1;
}
.col-auto {
	flex: 0 0 auto;
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
.btn {
	padding: 8px 16px;
	border-radius: 8px;
	font-weight: 500;
	cursor: pointer;
	border: none;
}
.btn-danger {
	background-color: #ef4444;
	color: white;
}
.btn-danger:hover {
	background-color: #dc2626;
}
.btn-secondary {
	background-color: #6b7280;
	color: white;
}
.btn-secondary:hover {
	background-color: #5b6270;
}
.text-muted {
	font-size: 0.9rem;
	color: #6b7280;
	margin-bottom: 1rem;
}
.mt-2 {
	margin-top: 0.5rem;
}
</style>
