# loan-servicing-app

Frontend + backend monorepo for **Ignition Auto Finance** (the "Loan
Servicing Notification Validator") — a personal full-stack project
simulating a customer-facing loan/lease servicing platform (registration,
dashboard, payments, due-date changes, autopay, transactional emails). Built
to demonstrate full-stack test automation patterns (UI, API, DB, email) in a
companion repo: [`loan-servicing-automation`](https://github.com/REPLACE_ME/loan-servicing-automation).

Built by **Sai**, a Senior SDET/QA Consultant, as an interview portfolio
piece alongside real GM Financial and Deloitte experience. This is an
original, self-built system — not affiliated with or derived from any
employer's codebase.

## Status

✅ Stages 0–4 complete: schema, backend API, transactional email, and a full
UI/UX redesign (dark theme + feature expansion) are all built, deployed, and
manually QA'd.

🚧 Next: [`loan-servicing-automation`](#) — the Playwright TypeScript test
suite (Stages 5–8).

## Features

- **Registration** — 3-step flow (identity verification → account setup →
  OTP verification), with account-enumeration-safe error messages, OTP
  resend/lockout, and full password/email validation
- **Login** — email/password, generic error on failure
- **Dashboard** — account & vehicle summary (incl. VIN, color, phone,
  member-since), payment progress gauge, amount-due header with late-fee
  calculation, payoff calculator (APR-based estimate), payment history table
- **Payments** — ACH transfer / debit card / manual, with automatic
  overpayment capping at the remaining balance
- **Autopay** — togglable per account; when enabled, a past-due account is
  automatically charged on the next dashboard load (simulated — no real
  scheduler), advancing the due date and emailing a confirmation
- **Due date changes** — forward-only, max 10-day shift, 2-per-account
  lifetime cap
- **Transactional email** — OTP, registration confirmation, payment
  confirmation (autopay-aware), due-date-change confirmation, all sent via
  Mailtrap's Email Testing sandbox
- **Notifications** — session-only toast/activity feed in the UI (not
  persisted to the database, by design)

All business rules above are documented in detail in the project's
requirements/build-plan doc (source of truth for validation rules, config
values, and the staged implementation plan).

## Structure

```
frontend/   React + TypeScript (Vite) — deployed to Vercel (Root Directory = frontend/)
backend/    Node.js + Express + TypeScript — deployed to Render (Root Directory = backend/)
```

<details>
<summary>Frontend structure</summary>

```
frontend/src/
├── pages/          Home, Register, Login, Dashboard
├── components/     Nav, Toast, Modal, Gauge, Spinner, StepIndicator
├── api/            client.ts — single typed API client
└── App.tsx         Routing (React Router), auth guards, ToastProvider
```
</details>

<details>
<summary>Backend structure</summary>

```
backend/src/
├── routes/         auth, registration, registrationOtp, registrationSetup,
│                   dashboard (+ /autopay), payment, payments, dueDateChange
├── services/        billingService, configService, autopayService
├── email/           templates/ (OTP, registration, payment, DDC confirmation)
├── db/schema/       001–007 (numbered SQL migrations, run in order)
└── server.ts
```
</details>

## Monorepo scripts

Run workspace commands from the repository root:

```bash
npm install
npm run dev:backend   # starts Express API from backend/
npm run dev:frontend  # starts Vite dev server from frontend/
```

## Local development

1. Install dependencies at the repo root:
   ```bash
   npm install
   ```
2. Start the backend:
   ```bash
   npm run dev:backend
   ```
3. Start the frontend:
   ```bash
   npm run dev:frontend
   ```
4. Open the frontend app at `http://localhost:5173/`.

> **Port already in use?** `ts-node-dev`'s `--respawn` can leave a stale
> process on port 4000 after an ungraceful restart. On Windows:
> `netstat -ano | findstr :4000` to find the PID, then `taskkill /PID <pid> /F`.

### Local env settings

- `backend/.env` should contain the Render-style backend values.
- `frontend/.env.local` should contain `VITE_API_URL` for the backend, e.g.:
  ```env
  VITE_API_URL=http://localhost:4000
  ```

## Database

Migrations live in `backend/src/db/schema/`, numbered and run in order
against Neon Postgres:

| File | Purpose |
|---|---|
| `001_init.sql` | Core tables: `accounts`, `customers`, `otp_codes`, `payments`, `config` |
| `002_seed_config.sql` | Business-rule config values (late fee %, OTP limits, DDC caps, etc.) |
| `003_seed_accounts.sql` | 9 seed accounts across all 4 account types, for negative-test coverage |
| `004_pending_registration.sql` | Columns supporting the multi-step registration flow |
| `005_backfill_seed_payments.sql` | Backfills the payments ledger for pre-seeded accounts |
| `006_ui_redesign_fields.sql` | Stage 4: `vin`, `vehicle_color`, `phone`, `apr`, `autopay_enabled` on accounts; `method` enum on payments |
| `007_seed_ui_fields.sql` | Stage 4: real VIN/color/phone/APR/autopay values for the 9 seed accounts |

## Backend config

The backend reads configuration from environment variables in `backend/src/config/env.ts`.

Required production values:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `EMAIL_FROM`

Mailtrap SMTP values may be provided as either:

- `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASS`
- or legacy names: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

> Use Mailtrap's **Email Testing** sandbox (`sandbox.smtp.mailtrap.io`,
> per-inbox credentials) — not the Sending product (`live.smtp.mailtrap.io`
> with an API token), which is the wrong product for this project.

### Recommended `backend/.env.example`

```env
PORT=4000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=
REGISTRATION_JWT_EXPIRES_IN=15m
LOGIN_JWT_EXPIRES_IN=24h
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=
MAILTRAP_PASS=
EMAIL_FROM=Loan Servicing <no-reply@loanservicing.demo>
CORS_ORIGIN=*
```

> For Render production, set `CORS_ORIGIN` to your exact Vercel frontend URL, e.g.:
> `https://loan-servicing-app-frontend.vercel.app`
> and do not include a trailing slash.

## Frontend config

The frontend uses Vite and expects one environment variable in production:

- `VITE_API_URL` — the backend base URL

Example `frontend/.env.local` for local development:

```env
VITE_API_URL=http://localhost:4000
```

Example production variable in Vercel:

```env
VITE_API_URL=https://loan-servicing-app.onrender.com
```

The frontend uses `BrowserRouter` and requires `frontend/vercel.json` so direct
route refreshes like `/login`, `/register`, and `/dashboard` resolve correctly.

## Deployment notes

### Backend on Render

- Root directory: `backend/`
- Build: `npm run build`
- Start: `npm start`
- Ensure the Render environment includes `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, and the Mailtrap/SMTP values.
- Render's free tier spins down after inactivity — expect a ~30–60s cold
  start on the first request after idle. Handled with a warm-up ping in the
  automation repo's CI workflow (Stage 7).

### Frontend on Vercel

- Root directory: `frontend/`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://loan-servicing-app.onrender.com`
- `frontend/vercel.json` must be deployed to support SPA rewrites.

## Authentication behavior

- Authenticated users are redirected from `/login` and `/register` back to `/dashboard`.
- The dashboard route is protected and requires a valid login token.

## What this project demonstrates

Built as a companion to `loan-servicing-automation`, this app exists to give
that test suite real, config-driven business rules to validate — late fees,
OTP lockouts, due-date-change caps, overpayment handling, and a simulated
autopay auto-charge with a real idempotency guard (due-date advancement
prevents double-charging on repeated dashboard loads). See the requirements
doc for the full negative-test-case list this app was built to support.