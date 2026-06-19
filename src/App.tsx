import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ProtectedRoute from './components/ProtectedRoute'
import Layout, { IndexRedirect } from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PatientsPage from './pages/PatientsPage'
import AppointmentsPage from './pages/AppointmentsPage'
import PatientDetailPage from './pages/PatientDetailPage'
import NewVisitPage from './pages/NewVisitPage'
import BillingPage from './pages/BillingPage'
import SettingsPage from './pages/SettingsPage'
import LabDashboardPage from './pages/LabDashboardPage'
import PharmacyPage from './pages/PharmacyPage'
import AdminAppointmentsPage from './pages/AdminAppointmentsPage'
import ReportsPage from './pages/ReportsPage'
import MessagesPage from './pages/MessagesPage'

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: 1, 
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 3 * 60 * 1000 // Refresh data every 3 minutes
    } 
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer position="top-right" />
      <BrowserRouter>
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
      </BrowserRouter>
    </QueryClientProvider>
  )
}
