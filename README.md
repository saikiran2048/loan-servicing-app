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

## Requirements

Full business rules and specs live in `REQUIREMENTS.md` (or the build-plan
HTML) tracked alongside this project. Source of truth for all validation
rules, config values, and email specs.

## Local dev

```bash
npm install
npm run dev:backend     # starts Express API
npm run dev:frontend    # starts Vite dev server
```

## Status

🚧 Stage 0 — repo scaffolding. See staged implementation plan for what's next.
