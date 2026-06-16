<template>
	<div class="settings">
		<aside>
			<button @click="store.switchSection('createUser')">Opret Bruger</button>
			<button @click="store.switchSection('updateUser')">Opdater Bruger</button>
			<br />
			<br />
			<br />
			<section>
				<CreateUser v-if="store.activeSection === 'createUser'" />
				<UpdateUser v-if="store.activeSection === 'updateUser'" />
			</section>
		</aside>
	</div>
</template>

<script setup>
import { useSettingsStore } from '@/stores/settingsStore'
import CreateUser from '@/components/CreateUser.vue'
import UpdateUser from '@/components/UpdateUser.vue'

const store = useSettingsStore()

/* 
possible future additions
1. User Management Create User Update User Delete/Deactivate User Role/Permission Management 
2. Account Settings Change Password Two-Factor Authentication (2FA) Email & Contact Info update 
3. Preferences Language/Locale Selection Theme (Light/Dark Mode) 
4. Business Info Company Profile (address, logo, legal info) Billing/Subscription details 
5. Notifications Email/SMS notification preferences Push notification settings 
6. Security API keys/access tokens management Security audit log Active sessions/devices list, with ability to log out remotely 
7. Data & Privacy Export/Delete personal data (GDPR tools) Data Retention settings 
*/
</script>

<style>
@media (min-width: 1024px) {
	.settings {
		background-color: azure;
		min-height: 100vh;
		display: flex;
	}
}
</style>
