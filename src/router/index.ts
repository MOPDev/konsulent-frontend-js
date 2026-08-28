import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore, RIGHTS_PRESETS } from '@/stores/auth'
import HomeView from '../views/HomeView.vue'

declare module 'vue-router' {
	interface RouteMeta {
		roles?: string[]
	}
}

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		name: 'home',
		component: HomeView,
		meta: {
			roles: RIGHTS_PRESETS.ALL,
		},
	},
	{
		path: '/login',
		name: 'login',
		component: () => import('@/views/LoginPage.vue'),
	},
	{
		path: '/settings',
		name: 'settings',
		component: () => import('@/views/SettingsView.vue'),
		meta: {
			roles: RIGHTS_PRESETS.ADMIN,
		},
	},
	{
		path: '/profile',
		name: 'profile',
		component: () => import('@/views/ProfileView.vue'),
		meta: {
			roles: RIGHTS_PRESETS.ALL,
		},
	},
	{
		path: '/Auditor/:id',
		name: 'Auditor',
		component: () => import('@/views/AuditorView.vue'),
		meta: {
			roles: RIGHTS_PRESETS.AUDITOR,
		},
	},
	{
		path: '/routeEditor/:id',
		name: 'routeEditor',
		component: () => import('@/views/RouteEditorView.vue'),
		meta: {
			roles: RIGHTS_PRESETS.OFFICE,
		},
	},
	{
		path: '/routeplanner',
		name: 'routeplanner',
		component: () => import('@/views/RouteplannerView.vue'),
		meta: {
			roles: RIGHTS_PRESETS.OFFICE,
		},
	},
	{
		path: '/archive',
		name: 'archive',
		component: () => import('@/views/ArchiveView.vue'),
		meta: {
			roles: RIGHTS_PRESETS.OFFICE,
		},
	},
	{
		path: '/form/:id',
		name: 'form',
		component: () => import('@/views/FormView.vue'),
		meta: {
			roles: RIGHTS_PRESETS.AUDITOR,
		},
	},
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
})

router.beforeEach(async (to, from, next) => {
	const authStore = useAuthStore()

	if (to.path === '/login') {
		if (authStore.initializing) await authStore.fetchUser()
		return authStore.isAuthenticated ? next('/') : next()
	}

	// re-validate against the server on every protected navigation
	await authStore.fetchUser()

	if (!authStore.isAuthenticated) {
		return next('/login')
	}

	if (to.meta.roles?.length) {
		const SUPER_ROLES = ['admin', 'developer']
		const userRight = authStore.userRights
		const allowed =
			userRight && (SUPER_ROLES.includes(userRight) || to.meta.roles.includes(userRight))

		if (!allowed) {
			if (!userRight) authStore.user = null
			return next('/login')
		}
	}

	next()
})

export default router
