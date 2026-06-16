<template>
	<div class="add-routes">
		<h3>Upload Besøgs Liste fra RoutePlanner</h3>

		<form @submit.prevent="handleUpload">
			<div>
				<label>Excel-fil (xlsx):</label>
				<input type="file" accept=".xlsx, .xls" @change="onFileChange" required />
			</div>
			<div>
				<label>Vælg konsulent til ruten:</label>
				<br />
				<select v-model="selectedUser" required>
					<option value="" disabled>Vælg konsulent</option>
					<option v-for="user in users" :key="user.ID" :value="user.ID">
						{{ user.name }}
					</option>
				</select>
			</div>
			<div>
				<label>Vælg dato for ruten:</label>
				<br />
				<input type="date" v-model="selectedDate" :min="today" required />
			</div>

			<button
				@click="uploadPlannedRoute"
				type="submit"
				:disabled="!excelRows.length || !selectedUser"
			>
				Upload
			</button>
		</form>

		<div v-if="excelRows.length">
			<h4>Forhåndsvisning</h4>
			<table>
				<thead>
					<tr>
						<th v-for="(col, idx) in excelColumns" :key="idx">{{ col }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(row, idx) in excelRows.slice(0, 10)" :key="idx">
						<td v-for="col in excelColumns" :key="col">{{ row[col] }}</td>
					</tr>
				</tbody>
			</table>
			<span v-if="excelRows.length > 10"
				>Viser kun de første 10 rækker ud af {{ excelRows.length }}</span
			>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import api from '@/utils/axios'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const users = ref([])
const selectedUser = ref()
const excelFile = ref(null) // Store the actual file
const excelRows = ref([])
const excelColumns = ref([])
const isUploading = ref(false)
const uploadError = ref('')
const selectedDate = ref('')
const today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD

// Allowed file types for security
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB max

onMounted(async () => {
	try {
		// Check authentication before making API calls
		if (!authStore.isAuthenticated) {
			throw new Error('User not authenticated')
		}

		const response = await api.get('/users')
		users.value = response.data.users
	} catch (err) {
		console.error('Failed to fetch users:', err)
		// Handle error appropriately - maybe redirect to login if 401
		if (err.response?.status === 401) {
			authStore.logout()
		}
	}
})

function validateFile(file) {
	if (!file) {
		throw new Error('Ingen fil valgt')
	}

	// Check file extension
	const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
	if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
		throw new Error('Kun Excel filer (.xlsx, .xls) er tilladt')
	}

	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		throw new Error('Filen er for stor. Maksimum størrelse er 10MB')
	}

	return true
}

function onFileChange(e) {
	const file = e.target.files[0]

	try {
		if (!file) {
			resetFileData()
			return
		}

		// Validate file before processing
		validateFile(file)

		// Store the file for later upload
		excelFile.value = file
		uploadError.value = ''

		const reader = new FileReader()
		reader.onload = (evt) => {
			try {
				const data = new Uint8Array(evt.target.result)
				const workbook = XLSX.read(data, { type: 'array' })
				const sheetName = workbook.SheetNames[0]
				const ws = workbook.Sheets[sheetName]
				const json = XLSX.utils.sheet_to_json(ws, { defval: '' })

				if (json.length === 0) {
					throw new Error('Excel filen er tom')
				}

				excelRows.value = json
				excelColumns.value = Object.keys(json[0] || {})
			} catch (error) {
				console.error('Error reading Excel file:', error)
				uploadError.value = 'Kunne ikke læse filen, tjek format!'
				resetFileData()
			}
		}

		reader.onerror = () => {
			uploadError.value = 'Fejl ved læsning af fil'
			resetFileData()
		}

		reader.readAsArrayBuffer(file)
	} catch (error) {
		uploadError.value = error.message
		resetFileData()
	}
}

function resetFileData() {
	excelFile.value = null
	excelRows.value = []
	excelColumns.value = []
}

function resetForm() {
	excelFile.value = null
	excelRows.value = []
	excelColumns.value = []
	selectedUser.value = ''
	selectedDate.value = ''

	// Clear the file input
	const fileInput = document.querySelector('input[type="file"]')
	if (fileInput) fileInput.value = ''
}

async function uploadPlannedRoute() {
	if (!excelFile.value || !selectedUser.value || !selectedDate.value) {
		uploadError.value = 'Alle felter skal udfyldes'
		return
	}

	if (!authStore.isAuthenticated) {
		uploadError.value = 'Du skal være logget ind for at uploade'
		return
	}

	try {
		isUploading.value = true
		uploadError.value = ''

		// Create FormData to send the file
		const formData = new FormData()
		formData.append('file', excelFile.value)
		formData.append('userId', selectedUser.value)
		formData.append('date', selectedDate.value)

		const response = await api.post('/visits/plan', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
			// Track upload progress if needed
			onUploadProgress: (progressEvent) => {
				const percentCompleted = Math.round(
					(progressEvent.loaded * 100) / progressEvent.total,
				)
				console.log(`Upload Progress: ${percentCompleted}%`)
			},
		})

		console.log('Upload successful:', response.data)

		// Reset form after successful upload
		resetForm()
		// Clear the file input
		const fileInput = document.querySelector('input[type="file"]')
		if (fileInput) fileInput.value = ''
	} catch (error) {
		console.error('Upload failed:', error)

		if (error.response?.status === 401) {
			authStore.logout()
			uploadError.value = 'Session udløbet. Log ind igen.'
		} else if (error.response?.status === 413) {
			uploadError.value = 'Filen er for stor'
		} else {
			uploadError.value = error.response?.data?.message || 'Upload fejlede. Prøv igen.'
		}
	} finally {
		isUploading.value = false
	}
}
</script>
<style scoped>
.add-routes {
	width: 100%;
	max-width: 1200px;
	margin: 0 auto;
}
form > div {
	margin-bottom: 0.75rem;
}
table {
	width: 100%;
	border-collapse: collapse;
	margin-top: 0.625rem;
	font-size: 0.875rem;
}
th,
td {
	border: 1px solid #ddd;
	padding: 0.375rem;
}
@media (max-width: 768px) {
	table {
		font-size: 0.75rem;
	}
	th,
	td {
		padding: 0.25rem;
	}
}
</style>
