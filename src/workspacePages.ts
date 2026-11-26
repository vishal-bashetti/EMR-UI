export const workspacePages = {
  '/dashboard': () => import('./pages/DashboardPage'),
  '/today': () => import('./pages/TodayPage'),
  '/patients': () => import('./pages/PatientsPage'),
  '/appointments': () => import('./pages/AppointmentsPage'),
  '/admin-appointments': () => import('./pages/AdminAppointmentsPage'),
  '/visits/new': () => import('./pages/ConsultationEntryPage'),
  '/billing': () => import('./pages/BillingPage'),
  '/labs': () => import('./pages/LabDashboardPage'),
  '/pharmacy': () => import('./pages/PharmacyPage'),
  '/reports': () => import('./pages/ReportsPage'),
  '/messages': () => import('./pages/MessagesPage'),
  '/settings': () => import('./pages/SettingsPage'),
}

export function preloadWorkspacePage(to: string) {
  const path = to.split('?')[0] as keyof typeof workspacePages
  workspacePages[path]?.().catch(() => undefined)
}
