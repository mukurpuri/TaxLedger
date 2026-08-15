# TaxLedger

Income-tax and GST filing platform for individual taxpayers and small businesses in India. The API is an Express + Prisma service; the browser UI is a Vite React app in `web/`.

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (local install, or Docker)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` and `JWT_SECRET`. To start Postgres with Docker:

```bash
docker compose up -d
```

Then apply the schema and seed AY 2025-26 tax slabs:

```bash
npx prisma migrate dev
npm run db:seed
```

`npm install` also runs `prisma generate`. Re-run `npx prisma generate` after any schema change.

Seeded staff accounts (password `ChangeMeNow1`):

- `admin@taxledger.in` (admin)
- `ca@taxledger.in` (CA)

Taxpayer accounts are created from the web app register form.

## Run

API (default `http://localhost:3000`):

```bash
npm run dev
```

Frontend (default `http://localhost:5173`, proxies `/api` in development if you point `VITE_API_URL` at the API origin):

```bash
cd web
npm install
npm run dev
```

Production API build:

```bash
npm run build
npm start
```

## Environment

See `.env.example`. Required variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | HMAC secret for session tokens |
| `PAYMENT_GATEWAY_KEY` | Simulated payment gateway key |
| `PORT` | HTTP listen port (default `3000`) |
| `CORS_ORIGIN` | Allowed browser origin |
| `UPLOAD_DIR` | Local directory for Form-16 / receipt uploads |
| `NODE_ENV` | `development` or `production` |
| `JWT_EXPIRES_IN` | Session lifetime, e.g. `8h` |

## API

All filing, payment, document, and tax routes require a session (`Authorization: Bearer <token>`).

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/auth/register` | Create a taxpayer account |
| `POST` | `/auth/login` | Issue a session token |
| `GET` | `/auth/me` | Current user |
| `POST` | `/filings` | Create a draft return and compute tax |
| `GET` | `/filings` | List the caller's filings |
| `GET` | `/filings/:id` | Fetch one filing |
| `PATCH` | `/filings/:id/submit` | Submit after tax is paid when tax is due |
| `POST` | `/filings/:id/payments` | Pay computed tax |
| `POST` | `/filings/:id/documents` | Multipart upload (`file` + `type`) |
| `POST` | `/tax/calculate` | Compute tax without persisting a filing |
| `POST` | `/gst/calculate` | GST on a taxable amount |
| `GET` | `/admin/filings` | CA / admin listing |
| `GET` | `/admin/filings/:id` | CA / admin detail |
| `PATCH` | `/admin/filings/:id/status` | Advance assessment / refund status |
| `GET` | `/health` | Liveness |

PAN must match `AAAAA9999A`. Assessment year must match `YYYY-YY` (for example `2025-26`).

## Tax engine

New-regime slabs for AY 2025-26 are seeded from the Finance Act rates (0–3L nil, 3–7L 5%, 7–10L 10%, 10–12L 15%, 12–15L 20%, above 15L 30%). Computation walks those rows, applies Section 87A (including marginal relief), surcharge where applicable, and 4% health and education cess.
