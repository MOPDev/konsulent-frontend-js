/* App.vue */
<template>
	<BNavbar toggleable="lg" class="custom-navbar">
		<BNavbarBrand v-if="authStore.isAuthenticated" :to="{ path: '/' }">
			<img :src="logo" alt="DAI logo" class="logo-img" />
		</BNavbarBrand>

		<BNavbarToggle target="navbar-nav-content" />

		<BCollapse id="navbar-nav-content" is-nav>
			<BNavbarNav>
				<BNavItem to="/routeplanner" v-if="authStore.isAuthenticated"
					>Rute planlægning</BNavItem
				>
				<BNavItem to="/login" v-if="!authStore.isAuthenticated">Login</BNavItem>
			</BNavbarNav>
			<BNavbarNav class="ms-auto" v-if="authStore.isAuthenticated">
				<BNavItemDropdown right no-caret>
					<template #button-content>
						<span class="gear-icon">&#9881;</span>
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
