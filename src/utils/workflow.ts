import type { Appointment, User } from '../types'

export const can = (user: User | undefined, permission: string) =>
  user?.role?.name === 'Admin' || !!user?.role?.permissions?.some(item => item.name === permission)

export const consultationPath = (appointment: Appointment) => {
  if (['Completed', 'Cancelled', 'No Show'].includes(appointment.status) || appointment.encounter_status === 'Completed') {
    return `/patients/${appointment.patient_id}?tab=visits`
  }
  const query = new URLSearchParams({ patient_id: String(appointment.patient_id), appointment_id: String(appointment.id), doctor_id: String(appointment.doctor_id) })
  if (appointment.encounter_id) {
    query.set('encounter_id', String(appointment.encounter_id))
    query.set('edit', 'true')
  }
  return `/visits/new?${query}`
}

export const worklistStage = (appointment: Appointment) => {
  if (['Completed', 'Cancelled', 'No Show'].includes(appointment.status)) return 'finished'
  if (appointment.status === 'Ongoing') return 'consulting'
  if (['Waiting', 'Wait', 'Checked In', 'Open'].includes(appointment.status)) return 'waiting'
  return 'scheduled'
}

export const localDate = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
