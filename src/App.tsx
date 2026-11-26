import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ProtectedRoute from './components/ProtectedRoute'
import Layout, { IndexRedirect } from './components/Layout'
import { lazy, Suspense } from 'react'
import { workspacePages } from './workspacePages'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(workspacePages['/dashboard'])
const TodayPage = lazy(workspacePages['/today'])
const PatientsPage = lazy(workspacePages['/patients'])
const AppointmentsPage = lazy(workspacePages['/appointments'])
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'))
const ConsultationEntryPage = lazy(workspacePages['/visits/new'])
const BillingPage = lazy(workspacePages['/billing'])
const SettingsPage = lazy(workspacePages['/settings'])
const LabDashboardPage = lazy(workspacePages['/labs'])
const PharmacyPage = lazy(workspacePages['/pharmacy'])
const AdminAppointmentsPage = lazy(workspacePages['/admin-appointments'])
const ReportsPage = lazy(workspacePages['/reports'])
const MessagesPage = lazy(workspacePages['/messages'])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,              // 1 min — data stays fresh without constant refetch
      refetchOnWindowFocus: false,    // opt-in per query where needed
      refetchInterval: false,         // disable global polling
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer position="top-right" />
      <BrowserRouter>
        <Suspense fallback={<div role="status" className="flex h-dvh items-center justify-center bg-slate-50 text-sm text-slate-500">Loading your workspace…</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<IndexRedirect />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="today" element={<TodayPage />} />
              <Route path="patients" element={<PatientsPage />} />
              <Route path="patients/:id" element={<PatientDetailPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="admin-appointments" element={<AdminAppointmentsPage />} />
              <Route path="visits/new" element={<ConsultationEntryPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="labs" element={<LabDashboardPage />} />
              <Route path="pharmacy" element={<PharmacyPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
