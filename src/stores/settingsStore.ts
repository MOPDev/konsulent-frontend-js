import { defineStore } from 'pinia'

interface SettingsState {
  activeSection: string
}

export const useSettingsStore = defineStore('useSettingsStore', {
  state: (): SettingsState => ({
    activeSection: 'createUser',
  }),
  actions: {
    switchSection(section: string) {
      this.activeSection = section
    },
  },
})
