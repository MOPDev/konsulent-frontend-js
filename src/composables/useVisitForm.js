import { computed } from 'vue'

export function useVisitForm(props, emit) {
  const fd = computed({
    get: () => props.formData,
    set: (v) => emit('update:formData', v),
  })

  function calculateAge(birthday) {
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

  const filteredData = computed(() => {
    const visit = props.visitData || {}
    const debitors = (visit.debitors || []).map((d) => ({
      ...d,
      age: calculateAge(d.birthday),
    }))
    return { ...visit, debitors }
  })

  function removeAt(index) {
    emit('remove-image', index)
  }

  function onUpdateFiles(next) {
    emit('update:formData', { ...props.formData, images: next })
  }

  return { fd, filteredData, removeAt, onUpdateFiles }
}
