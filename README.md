# loan-servicing-app

Frontend + backend monorepo for the **Loan Servicing Notification Validator** —
a personal full-stack project simulating a customer-facing loan/lease servicing
platform (registration, dashboard, payments, due-date changes, transactional
emails). Built to demonstrate full-stack test automation patterns (UI, API,
DB, email) in a companion repo: [`loan-servicing-automation`](#).

This is an original, self-built system — not affiliated with or built from
any employer's codebase.

## Structure

```
frontend/   React + TypeScript (Vite) — deployed to Vercel (Root Directory = frontend/)
backend/    Node.js + Express + TypeScript — deployed to Render (Root Directory = backend/)
```

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

### Local env settings

- `backend/.env` should contain the Render-style backend values.
- `frontend/.env.local` should contain `VITE_API_URL` for the backend, e.g.:
  ```env
  VITE_API_URL=http://localhost:4000
  ```

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

### Frontend on Vercel

- Root directory: `frontend/`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://loan-servicing-app.onrender.com`
- `frontend/vercel.json` must be deployed to support SPA rewrites.

## Authentication behavior

- Authenticated users are redirected from `/login` and `/register` back to `/dashboard`.
- The dashboard route is protected and requires a valid login token.

## Status

✅ Local dev works and production routing is configured for Vercel + Render.

🚧 Remaining work: full UX polish and additional production hardening.
