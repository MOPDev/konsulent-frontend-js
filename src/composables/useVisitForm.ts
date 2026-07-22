import { computed, type ComputedRef } from 'vue'

interface VisitFormProps {
  formData: Record<string, unknown>
  visitData?: Record<string, unknown>
}

interface VisitFormEmits {
  (e: 'update:formData', val: Record<string, unknown>): void
  (e: 'remove-image', index: number): void
}

interface DebitorWithAge {
  age: number | string
  birthday?: string
  name?: string
  [key: string]: unknown
}

interface FilteredVisitData {
  debitors: DebitorWithAge[]
  [key: string]: unknown
}

interface UseVisitFormReturn {
  fd: ComputedRef<Record<string, unknown>>
  filteredData: ComputedRef<FilteredVisitData>
  removeAt: (index: number) => void
  onUpdateFiles: (next: unknown[]) => void
}

export function useVisitForm(props: VisitFormProps, emit: VisitFormEmits): UseVisitFormReturn {
  const fd = computed({
    get: () => props.formData,
    set: (v) => emit('update:formData', v),
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
    const debitors: DebitorWithAge[] = (visit.debitors as DebitorWithAge[] | undefined) || []
    return { ...visit, debitors: debitors.map((d) => ({ ...d, age: calculateAge(d.birthday) })) }
  })

  function removeAt(index: number) {
    emit('remove-image', index)
  }

  function onUpdateFiles(next: unknown[]) {
    emit('update:formData', { ...props.formData, images: next })
  }

  return { fd, filteredData, removeAt, onUpdateFiles }
}
