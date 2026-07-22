<template>
  <p :class="[applyClassToAll && number ? activeClass : '']">
    <span :class="[!applyClassToAll && number ? activeClass : '']">{{ number }}</span> {{ text }}
  </p>
</template>

<script setup lang="ts">
defineProps<{
  number: number
  text: string
  activeClass?: string
  applyClassToAll?: boolean
}>()
</script>

<style lang="sass" scoped>
p
  margin: 0
  font-size: 90%
</style>
