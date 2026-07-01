<template>
  <div style="margin: 16px">
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <p>{{ debt?.Fordringsbeskrivelser }}</p>
    <p>{{ debt?.Sagsfremstillinger }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  debt: { type: Object, default: null },
})
</script>
