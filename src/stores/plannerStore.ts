import { defineStore } from 'pinia'

interface PlannerState {
	activeTab: string
}

export const usePlannerStore = defineStore('usePlannerStore', {
	state: (): PlannerState => ({
		activeTab: 'createVisits',
	}),
	actions: {
		switchTab(tab: string) {
			this.activeTab = tab
		},
	},
})
