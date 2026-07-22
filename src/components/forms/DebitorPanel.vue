<template>
  <div style="margin: 16px">
    <button
      class="debitor-toggle"
      @click="toggleExpanded"
      :aria-expanded="expanded ? 'true' : 'false'"
      aria-controls="debitor-panel"
    >
      <span>Debitor: {{ debitorName }}</span>
    </button>
    <div v-if="expanded">
      <DocxPdfViewer :docBlob="docBlob" height="800px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DocxPdfViewer from '@/components/DocxPdfViewer.vue'

interface Props {
  debitorName?: string
  docBlob?: any
}

withDefaults(defineProps<Props>(), {
  debitorName: '—',
  docBlob: null,
})

const expanded = ref(false)
const toggleExpanded = () => {
  expanded.value = !expanded.value
}
</script>

<style scoped>
.debitor-toggle {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.debitor-toggle::after {
  content: ' ▸';
}
.debitor-toggle[aria-expanded='true']::after {
  content: ' ▾';
}
.debitor-toggle:hover {
  text-decoration: underline;
}
</style>
