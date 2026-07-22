import { computed, type ComputedRef } from 'vue'

interface VisitFormProps {
  formData: any
  visitData?: any
}

interface VisitFormEmits {
  (e: 'update:formData', val: any): void
  (e: 'remove-image', index: number): void
}

interface FilteredVisitData {
  debitors: any[]
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

  function calculateAge(birthday: string | undefined): number | string {
    if (!birthday) return ''
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const filteredData = computed<FilteredVisitData>(() => {
    const visit = props.visitData || {}
    const debitors: any[] = (visit.debitors as any[] | undefined) || []
    return { ...visit, debitors: debitors.map((d) => ({ ...d, age: calculateAge(d.birthday) })) }
  })

  function removeAt(index: number) {
    emit('remove-image', index)
  }

  function onUpdateFiles(next: any[]) {
    emit('update:formData', { ...props.formData, images: next })
  }

  return { fd, filteredData, removeAt, onUpdateFiles }
}
