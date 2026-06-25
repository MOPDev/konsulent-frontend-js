/* App.vue */
<template>
	<BNavbar toggleable="lg" class="custom-navbar">
		<BNavbarBrand v-if="authStore.isAuthenticated" :to="{ path: '/' }">
			<img :src="logo" alt="DAI logo" class="logo-img" />
		</BNavbarBrand>

		<BNavbarToggle target="navbar-nav-content" />

		<BCollapse id="navbar-nav-content" is-nav>
			<BNavbarNav>
				<BNavItem to="/routeplanner" v-if="authStore.isAuthenticated">Planlægning</BNavItem>
				<BNavItem to="/archive" v-if="authStore.isAuthenticated">Arkiv</BNavItem>
				<BNavItem to="/login" v-if="!authStore.isAuthenticated">Login</BNavItem>
			</BNavbarNav>
			<BNavbarNav class="ms-auto" v-if="authStore.isAuthenticated">
				<BNavItemDropdown right no-caret>
					<template #button-content>
						<span class="gear-icon">
							<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
								<path
									d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.16a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
								/>
							</svg>
						</span>
					</template>
					<BDropdownItem to="/profile">Profil</BDropdownItem>
					<BDropdownDivider />
					<BDropdownItem to="/settings" v-if="isAdminOrDeveloper"
						>Indstillinger</BDropdownItem
					>
				</BNavItemDropdown>
			</BNavbarNav>
		</BCollapse>
	</BNavbar>

	<main>
		<RouterView />
	</main>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import {
	BNavbar,
	BNavbarBrand,
	BNavbarNav,
	BNavItem,
	BNavItemDropdown,
	BDropdownItem,
	BDropdownDivider,
	BNavbarToggle,
	BCollapse,
} from 'bootstrap-vue-next'

import { useAuthStore } from '@/stores/auth.js'
import logo from '@/assets/DAI-logo.png'

const authStore = useAuthStore()
const isAdminOrDeveloper = computed(
	() => authStore.userRights === 'admin' || authStore.userRights === 'developer',
)
</script>

GLOBAL STYLE
<style>
button {
	margin: 5px;
	border-width: 1px;
}
</style>

<style scoped>
main {
	justify-self: center;
	display: flex;
	width: 100%;
	max-width: 1200px;
	padding: 0 1rem;
}

.custom-navbar {
	width: 100%;
	line-height: 1.5;
	padding: 0.5rem 1rem;
	background-color: rgba(99, 170, 219, 1) !important;
}

.logo-img {
	min-height: 5rem;
	height: 5rem;
	width: auto;
}

:deep(.navbar-nav) {
	gap: 0.5rem;
}

:deep(.nav-link) {
	color: white !important;
	padding: 0.5rem 1rem;
	border-radius: 0.25rem;
	transition: background-color 0.3s ease-in-out;
}

:deep(.nav-link:hover) {
	background-color: rgba(255, 255, 255, 0.2);
}

:deep(.nav-link.active) {
	background-color: rgba(255, 255, 255, 0.3);
}

.gear-icon {
	font-size: 1.4rem;
	line-height: 1;
}

@media (max-width: 768px) {
	.custom-navbar {
		padding: 0.5rem;
	}
}

@media (max-width: 480px) {
	main {
		padding: 0 0.5rem;
	}
}
</style>
