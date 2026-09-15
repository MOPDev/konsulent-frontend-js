import { computed, type ComputedRef } from 'vue'
import { VisitWithDebitors } from '@/api/visits'
import { DebitorWithoutVisits } from '@/schemas'

interface VisitFormProps {
	formData: any
	visitData?: VisitWithDebitors
}

interface VisitFormEmits {
	(e: 'update:formData', val: any): void
	(e: 'remove-image', index: number): void
}

interface FilteredVisitData {
	debitors: DebitorWithoutVisits[]
	[key: string]: any
}

interface UseVisitFormReturn {
	fd: ComputedRef<any>
	filteredData: ComputedRef<FilteredVisitData>
	removeAt: (index: number) => void
	onUpdateFiles: (next: any[]) => void
}

export function useVisitForm(props: VisitFormProps, emit: VisitFormEmits): UseVisitFormReturn {
	const fd = computed({
		get: () => props.formData,
		set: (v: any) => emit('update:formData', v),
	})

	const filteredData = computed<FilteredVisitData>(() => {
		const visit = props.visitData as VisitWithDebitors
		const debitors = (visit.debitors as DebitorWithoutVisits[] | undefined) ?? []
		return {
			...visit,
			debitors,
		}
	})

	function removeAt(index: number) {
		emit('remove-image', index)
	}

	function onUpdateFiles(next: any[]) {
		emit('update:formData', { ...props.formData, images: next })
	}

	return { fd, filteredData, removeAt, onUpdateFiles }
}
