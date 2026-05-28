// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, RIGHTS_PRESETS } from '@/stores/auth' // Import the auth store
import HomeView from '../views/HomeView.vue'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView,
			meta: {
				roles: RIGHTS_PRESETS.ALL, // This route requires all users
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
				roles: RIGHTS_PRESETS.ADMIN, // This route requires admin role
			},
		},
		{
			path: '/profile',
			name: 'profile',
			component: () => import('@/views/ProfileView.vue'),
			meta: {
				roles: RIGHTS_PRESETS.ALL, // This route requires admin role
			},
		},
		{
			path: '/Auditor/:id',
			name: 'Auditor',
			component: () => import('@/views/AuditorView.vue'),
			meta: {
				roles: RIGHTS_PRESETS.AUDITOR, // This route requires auditor role
			},
		},
		{
			path: '/routeEditor/:id',
			name: 'routeEditor',
			component: () => import('@/views/RouteEditorView.vue'),
			meta: {
				roles: RIGHTS_PRESETS.OFFICE, // This route requires office role
			},
		},
		{
			path: '/routeplanner',
			name: 'routeplanner',
			component: () => import('@/views/RouteplannerView.vue'),
			meta: {
				roles: RIGHTS_PRESETS.OFFICE, // This route requires office role
			},
		},
		{
			path: '/form/:id',
			name: 'form',
			component: () => import('@/views/FormView.vue'),
			meta: {
				roles: RIGHTS_PRESETS.AUDITOR, // This route requires auditor role
			},
		},
	],
})

// Add a global navigation guard
router.beforeEach(async (to, from, next) => {
	const authStore = useAuthStore()

	// Only fetch once on initial load
	if (authStore.initializing) {
		await authStore.fetchUser()
	}

	// Allow access to login page
	if (to.path === '/login') {
		return authStore.isAuthenticated ? next('/') : next()
	}

	// Must be authenticated for all other routes
	if (!authStore.isAuthenticated) {
		return next('/login') // removed alert, bad UX in guards
	}

	// Check role-based access
	if (to.meta.roles && to.meta.roles.length > 0) {
		const SUPER_ROLES = ['admin', 'developer']
		const userRight = authStore.userRights

		console.log('userRight:', userRight) // ✅ what is it actually?
		console.log('required roles:', to.meta.roles) // ✅ what does the route expect?

		const allowed =
			userRight && (SUPER_ROLES.includes(userRight) || to.meta.roles.includes(userRight))

		if (!allowed) {
			console.warn('Access denied: insufficient permissions') // ✅ log the reason for denial
			return next('/')
		}
	}

	next()
})

export default router
