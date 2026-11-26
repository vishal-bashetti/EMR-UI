// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { User } from '../src/types'
import { QuickAddMenu } from '../src/components/QuickAddMenu'
import PatientsPage from '../src/pages/PatientsPage'
import ConsultationEntryPage from '../src/pages/ConsultationEntryPage'
import TodayPage from '../src/pages/TodayPage'
import { AllergyStatus } from '../src/components/AllergyStatus'
import { PatientSnapshot } from '../src/components/PatientSnapshot'

const mocks = vi.hoisted(() => ({
  me: undefined as User | undefined,
  pending: false,
  patients: vi.fn(), create: vi.fn(), appointments: vi.fn(), allergies: vi.fn(),
}))
vi.mock('../src/hooks/useUsers', () => ({ useMe: () => ({ data: mocks.me, isPending: mocks.pending }) }))
vi.mock('../src/api/patients', () => ({ getPatients: mocks.patients, createPatient: mocks.create, deletePatient: vi.fn() }))
vi.mock('../src/api/appointments', () => ({ getAppointments: mocks.appointments }))
vi.mock('../src/hooks/useAppointments', () => ({ useUpdateAppointmentStatus: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('../src/components/DoctorAttentionQueueModal', () => ({ DoctorAttentionQueueModal: () => null }))
vi.mock('../src/api/clinicalHistory', () => ({ getAllergies: mocks.allergies, getProblems: async () => [], getMedications: async () => [] }))
vi.mock('../src/components/PatientQuickPreviewDrawer', () => ({ PatientQuickPreviewDrawer: () => null }))
vi.mock('../src/pages/NewVisitPage', () => ({ default: () => <div>Appointment selection reached</div> }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => ({
  'patients.firstName': 'First Name', 'patients.lastName': 'Last Name', 'patients.dob': 'Date of Birth',
  'patients.colGender': 'Gender', 'patients.contactNumber': 'Contact Number', 'patients.email': 'Email',
  'patients.bloodGroup': 'Blood Group', 'patients.modalTitle': 'New Patient', 'patients.savePatient': 'Save Patient',
  'common.cancel': 'Cancel',
}[key] || key) }) }))

const patient = { id: 20, first_name: 'Synthetic', last_name: 'Patient', dob: '1990-01-01', gender: 'Other', contact_number: '5550000', email: null, blood_group: null, opd_number: 'TEST-20' }
const user = (permissions: string[], name = 'Doctor'): User => ({ id: 2, username: name.toLowerCase(), email: '', is_active: true, role_id: 2, role: { id: 2, name, permissions: permissions.map((name, id) => ({ id, name, description: null })) } })
function Location() { const location = useLocation(); return <div data-testid="location">{location.pathname}{location.search}</div> }
function mount(children: ReactNode, path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>{children}<Location /></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => {
  mocks.me = user([], 'Admin'); mocks.pending = false
  mocks.patients.mockReset().mockResolvedValue([patient]); mocks.create.mockReset()
  mocks.appointments.mockReset().mockResolvedValue([]); mocks.allergies.mockReset().mockResolvedValue([])
})
afterEach(cleanup)

describe('consultation entry', () => {
  it('routes the dashboard primary action straight to patient selection', async () => {
    mocks.me = user(['manage_clinical', 'view_patients', 'view_appointments'])
    mount(<Routes><Route path="/today" element={<TodayPage />} /><Route path="/visits/new" element={<ConsultationEntryPage />} /></Routes>, '/today')
    await userEvent.click(screen.getByRole('button', { name: 'New Consultation' }))
    expect(await screen.findByRole('heading', { name: 'New Consultation' })).toBeTruthy()
    expect(await screen.findByRole('link', { name: 'Start consultation for Synthetic Patient' })).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('/visits/new?action=start')
  })
  it('offers a creation path even on an empty day and carries the selected patient/doctor to appointment selection', async () => {
    mocks.me = user(['view_patients', 'manage_clinical'])
    mount(<Routes><Route path="/visits/new" element={<ConsultationEntryPage />} /></Routes>, '/visits/new')
    await screen.findByText('No consultations for this day.')
    await userEvent.click(screen.getByRole('link', { name: 'New Consultation' }))
    expect(await screen.findByRole('heading', { name: 'New Consultation' })).toBeTruthy()
    await userEvent.click(await screen.findByRole('link', { name: 'Start consultation for Synthetic Patient' }))
    await screen.findByText('Appointment selection reached')
    expect(screen.getByTestId('location').textContent).toBe('/visits/new?patient_id=20&doctor_id=2')
  })
  it('searches patients after the debounce and offers recovery for empty results', async () => {
    mocks.patients.mockImplementation(async (query?: string) => query ? [] : [patient])
    mount(<ConsultationEntryPage />, '/visits/new?action=start')
    await screen.findByRole('link', { name: 'Start consultation for Synthetic Patient' })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search patients' }), 'missing')
    await screen.findByText('No patients match your search.')
    expect(mocks.patients).toHaveBeenLastCalledWith('missing')
    expect(screen.getByRole('link', { name: 'Register a new patient' }).getAttribute('href')).toBe('/patients?action=new')
  })
  it('does not load patient records for a role without consultation access', () => {
    mocks.me = user(['view_pharmacy'], 'Pharmacist')
    mount(<ConsultationEntryPage />, '/visits/new?action=start')
    expect(screen.getByRole('alert').textContent).toContain('do not have permission')
    expect(mocks.patients).not.toHaveBeenCalled()
  })
})

describe('role-aware quick actions and patient form', () => {
  it('hides pharmacist quick actions and does not intercept the new-patient shortcut', () => {
    mocks.me = user(['view_pharmacy'], 'Pharmacist')
    mount(<QuickAddMenu />)
    expect(screen.queryByRole('button', { name: 'Quick Add' })).toBeNull()
    const event = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, cancelable: true, bubbles: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(screen.getByTestId('location').textContent).toBe('/')
  })
  it('preserves permitted clinical actions while hiding patient registration', async () => {
    mocks.me = user(['view_clinical', 'manage_clinical', 'view_patients'])
    mount(<QuickAddMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Quick Add' }))
    expect(screen.queryByRole('button', { name: /New Patient/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /New Prescription/ }))
    expect(screen.getByTestId('location').textContent).toBe('/visits/new?action=start')
  })
  it('does not render a form or fetch patients for a denied direct URL', () => {
    mocks.me = user(['view_pharmacy'], 'Pharmacist')
    mount(<PatientsPage />, '/patients?action=new')
    expect(screen.getByRole('alert').textContent).toContain('do not have permission')
    expect(screen.queryByRole('button', { name: 'Save Patient' })).toBeNull()
    expect(mocks.patients).not.toHaveBeenCalled()
  })
  it('does not reveal patient data or forms while permissions are loading', () => {
    mocks.me = undefined; mocks.pending = true
    mount(<PatientsPage />, '/patients?action=new')
    expect(screen.getByRole('status').textContent).toContain('Loading your permissions')
    expect(mocks.patients).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Save Patient' })).toBeNull()
  })
  it('allows read-only patient access without exposing a creation form', async () => {
    mocks.me = user(['view_patients'])
    mount(<PatientsPage />, '/patients?action=new')
    await screen.findByRole('link', { name: 'Synthetic Patient' })
    expect(screen.queryByRole('button', { name: 'Save Patient' })).toBeNull()
  })
  it('associates every registration field with a label, preserves validation, and names the close control', async () => {
    mount(<PatientsPage />, '/patients?action=new')
    for (const name of ['OPD Number', 'First Name', 'Last Name', 'Date of Birth', 'Gender', 'Contact Number', 'Email', 'Blood Group', 'Address', 'Language', 'Emergency Contact Name', 'Emergency Contact Phone']) {
      const input = screen.getByLabelText(new RegExp(`^${name}( \\*)?$`)) as HTMLInputElement
      expect(input.labels?.length).toBe(1)
    }
    const save = screen.getByRole('button', { name: 'Save Patient' })
    await userEvent.click(save)
    expect(mocks.create).not.toHaveBeenCalled()
    expect((screen.getByLabelText(/^OPD Number/) as HTMLInputElement).validity.valueMissing).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Close new patient form' }))
    expect(screen.queryByRole('button', { name: 'Save Patient' })).toBeNull()
  })
})

describe('allergy certainty', () => {
  it('keeps unknown, loading and unavailable states distinct without false reassurance', () => {
    const view = render(<AllergyStatus records={[]} />)
    expect(screen.getByRole('status').textContent).toContain('not been explicitly reviewed')
    view.rerender(<AllergyStatus records={[]} isPending />)
    expect(screen.getByRole('status').textContent).toBe('Checking allergy records…')
    view.rerender(<AllergyStatus records={[]} isError />)
    expect(screen.getByRole('status').textContent).toContain('unavailable')
    expect(screen.queryByText(/No known drug allergies/)).toBeNull()
  })
  it('shows active allergy details and does not present inactive entries as active', () => {
    render(<AllergyStatus records={[
      { id: 1, allergen: 'Penicillin', severity: 'Severe', status: 'Active', reaction: 'Rash' },
      { id: 2, allergen: 'Historical allergen', severity: 'Mild', status: 'Inactive', reaction: null },
    ]} />)
    expect(screen.getByRole('status').textContent).toContain('Penicillin (Severe)')
    expect(screen.getByRole('status').textContent).not.toContain('Historical allergen')
  })
  it('uses unreviewed status in the chart snapshot after an empty successful response', async () => {
    mount(<PatientSnapshot patient={patient} onOpenAssistant={() => {}} />)
    await screen.findByText('Allergy status has not been explicitly reviewed. Confirm before prescribing.')
    expect(screen.queryByText(/No known drug allergies/)).toBeNull()
  })
  it('shows unavailable in the chart when allergy retrieval fails', async () => {
    mocks.allergies.mockRejectedValue(new Error('offline'))
    mount(<PatientSnapshot patient={patient} onOpenAssistant={() => {}} />)
    await screen.findByText('Allergy records unavailable. Confirm directly before prescribing.')
    expect(screen.queryByText(/No known drug allergies/)).toBeNull()
  })
})
