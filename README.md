# EMR-UI

Frontend for the EMR (Electronic Medical Records) system.
Built with Vite + React, Tailwind CSS v4, Axios, TanStack Query, Zustand, and React Router v7.

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- EMR backend running on `http://localhost:9000` (see `../EMR/`)

## Setup

```bash
pnpm install
pnpm dev
```

App runs at `http://localhost:5173`.

## Default Login Credentials

| Username    | Password       | Role      |
|-------------|----------------|-----------|
| `admin`     | `admin123`     | Admin     |
| `doctor`    | `doctor123`    | Doctor    |
| `frontdesk` | `frontdesk123` | Frontdesk |

## Stack

| Tool | Purpose |
|------|---------|
| Vite + React | Build tool & UI framework |
| Tailwind CSS v4 | Utility-first styling |
| Axios | HTTP client with JWT interceptor & auto token refresh |
| TanStack Query | Server state, caching, invalidation |
| Zustand | Auth state (tokens, current user) |
| React Router v7 | Client-side routing & protected routes |

## Project Structure

```
src/
  api/           # Axios instance + per-resource API fns
    axios.js     # Base instance with auth interceptor & refresh logic
    auth.js
    patients.js
    appointments.js
    users.js
  store/
    authStore.js # Zustand: tokens, user, login/logout
  hooks/         # TanStack Query hooks wrapping API calls
    usePatients.js
    useAppointments.js
    useUsers.js
  components/
    Layout.jsx         # Sidebar nav shell
    ProtectedRoute.jsx # Redirects unauthenticated users
  pages/
    LoginPage.jsx
    DashboardPage.jsx
    PatientsPage.jsx
    AppointmentsPage.jsx
  App.jsx        # Router + QueryClientProvider setup
  main.jsx
```

## API Proxy

Vite proxies `/api` → `http://localhost:9000` in dev, so no CORS issues.
For production, configure your reverse proxy (nginx, etc.) to forward `/api` to the backend.

## Running Backend

```bash
# From ../EMR/
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker compose up -d
```
