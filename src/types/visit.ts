export interface Debitor {
	id?: number
	name: string
	birthday?: string
	age?: number
}

export interface Visit {
	id?: number
	debitors: Debitor[]
	// Add other visit fields as needed
}

export interface VisitFormData {
	images?: File[]
	// Add other form fields
}
