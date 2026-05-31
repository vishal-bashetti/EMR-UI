# EMR-UI

Frontend for the EMR (Electronic Medical Records) system.
Built with **Vite + React + TypeScript**, Tailwind CSS v4, Axios, TanStack Query, Zustand, and React Router v7.

The entire codebase is written in **TypeScript** (`.ts` / `.tsx`). All API request/response
shapes are modelled in [`src/types.ts`](src/types.ts) and shared across the API layer,
query hooks, and pages.

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- EMR backend running on `http://localhost:9000` (see [`../EMR/`](../EMR/))

## Setup

```bash
pnpm install
pnpm dev
```

App runs at `http://localhost:5173`.

## Scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Start the Vite dev server (port 5173) with `/api` proxied to the backend |
| `pnpm typecheck` | Run `tsc --noEmit` — full TypeScript type checking, emits nothing |
| `pnpm build` | Type-check, then produce a production build in `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm lint` | ESLint (typescript-eslint) over all `.ts`/`.tsx` files |

## Default Login Credentials

| Username    | Password       | Role      |
|-------------|----------------|-----------|
| `admin`     | `admin123`     | Admin     |
| `doctor`    | `doctor123`    | Doctor    |
| `frontdesk` | `frontdesk123` | Frontdesk |

## Stack

| Tool | Purpose |
|------|---------|
| Vite + React 19 | Build tool & UI framework |
| TypeScript | Static typing across the whole app |
| Tailwind CSS v4 | Utility-first styling |
| Axios | HTTP client with a JWT interceptor & automatic token refresh |
| TanStack Query | Server state, caching, invalidation |
| Zustand | Auth state (tokens, current user) |
| React Router v7 | Client-side routing & protected routes |

## Project Structure

```
src/
  types.ts             # Central domain types mirroring the backend schemas
  vite-env.d.ts        # Vite client type reference
  api/                 # Typed Axios instance + per-resource API functions
    axios.ts           # Base instance: auth interceptor & 401 → refresh logic
    auth.ts            # OAuth2 password login
    patients.ts  appointments.ts  billing.ts  settings.ts
    users.ts     visits.ts        drugs.ts    labResults.ts
  store/
    authStore.ts       # Zustand: tokens, user, login/logout
  hooks/               # TanStack Query hooks wrapping the API layer
    usePatients.ts  useAppointments.ts  useBilling.ts  useUsers.ts
    useVisits.ts    useDrugs.ts         useLabResults.ts  useSettings.ts
  components/
    Layout.tsx         # Sidebar nav shell + shared Avatar
    ProtectedRoute.tsx # Redirects unauthenticated users to /login
    Icons.tsx          # Inline SVG icon set
  pages/
    LoginPage.tsx          DashboardPage.tsx   PatientsPage.tsx
    PatientDetailPage.tsx  AppointmentsPage.tsx  NewVisitPage.tsx
    BillingPage.tsx        SettingsPage.tsx
  App.tsx              # Router + QueryClientProvider setup
  main.tsx             # React entry point
```

## Backend API Flow

The frontend talks to the FastAPI backend under `/api` (proxied in dev). Key endpoints:

### Front Desk

| Feature | Method & Endpoint |
|---------|-------------------|
| Patient live search | `GET /api/patients/?search=` (matches first/last name, email, phone) |
| Calendar slot config | `GET /api/settings/` (`slot_duration_minutes`, `start_time`, `end_time`) |
| List doctors | `GET /api/users/doctors` |
| Appointment types (dropdown) | `GET /api/appointments/types` |
| Appointment statuses (dropdown) | `GET /api/appointments/statuses` |
| Create appointment | `POST /api/appointments/` |
| Update appointment status | `PUT /api/appointments/{id}/status?status=` |
| **Billing suggestion** | `GET /api/billing/suggest/{appointment_id}` — auto-fills the invoice with the consultation fee + completed lab tests |
| Create / list / update / delete invoice | `POST` `GET` `PUT .../status` `DELETE /api/billing/` |

### Clinical

| Feature | Method & Endpoint |
|---------|-------------------|
| Create / search / view / update patient | `/api/patients/` |
| Vitals configuration | `GET /api/visits/vitals/config` |
| Carry-forward last visit | `GET /api/visits/last/{patient_id}` |
| Save all-in-one visit | `POST /api/visits/` |
| Visit history | `GET /api/visits/history/{patient_id}?limit=` |
| Lab catalog | `GET/POST /api/lab_catalog/` |
| Patient lab results | `GET /api/patients/{id}/lab_results` |
| Drug autocomplete | `GET /api/drugs/?search=` |

### Admin

| Feature | Method & Endpoint |
|---------|-------------------|
| Users | `GET/POST/PUT/DELETE /api/users/` |
| Roles | `GET/POST/PUT/DELETE /api/users/roles` |
| Permissions | `GET/POST /api/users/permissions` |

> Authentication: `POST /api/auth/login` (form-encoded) returns an access + refresh
> token pair. The Axios interceptor attaches the access token and transparently
> refreshes it via `POST /api/auth/refresh` on a `401`.

## API Proxy

Vite proxies `/api` → `http://localhost:9000` in dev (see `vite.config.ts`), so there are
no CORS issues during development. For production, configure your reverse proxy
(nginx, etc.) to forward `/api` to the backend.

## Running the Backend

```bash
# From ../EMR/
docker compose up -d
```

The backend connects to a PostgreSQL database via the `DATABASE_URL` in `../EMR/.env`.
