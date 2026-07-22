<template>
	<div style="margin: 16px">
		<h1>{{ title }}</h1>
		<p>{{ description }}</p>
		<p>{{ debt?.Fordringsbeskrivelser }}</p>
		<p>{{ debt?.Sagsfremstillinger }}</p>
	</div>
</template>

<script setup lang="ts">
interface Props {
	title: string
	description?: string
	debt?: any
}

withDefaults(defineProps<Props>(), {
	description: '',
	debt: null,
})
</script>
