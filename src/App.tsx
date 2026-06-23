import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ProtectedRoute from './components/ProtectedRoute'
import Layout, { IndexRedirect } from './components/Layout'
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PatientsPage = lazy(() => import('./pages/PatientsPage'))
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'))
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage'))
const NewVisitPage = lazy(() => import('./pages/NewVisitPage'))
const BillingPage = lazy(() => import('./pages/BillingPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LabDashboardPage = lazy(() => import('./pages/LabDashboardPage'))
const PharmacyPage = lazy(() => import('./pages/PharmacyPage'))
const AdminAppointmentsPage = lazy(() => import('./pages/AdminAppointmentsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))

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
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
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
              <Route path="patients" element={<PatientsPage />} />
              <Route path="patients/:id" element={<PatientDetailPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="admin-appointments" element={<AdminAppointmentsPage />} />
              <Route path="visits/new" element={<NewVisitPage />} />
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
