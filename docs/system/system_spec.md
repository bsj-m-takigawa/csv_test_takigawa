# System Specification

## 1. Overview
- Stack: Frontend Next.js(App Router, TS) / Backend Laravel 10 / MySQL
- Domains: Users CRUD, CSV Import/Export, Pagination
- Environments: local, staging, production

## 2. Functional Requirements
### 2.1 Users
- Create/Read/Update/Delete
- List with server-side pagination, sort, filter (name/email/status)
- Detail view
- Admin-only: future points operations (separate API)

### 2.2 CSV
- Import: validate per row, transactional batches, error rows CSV export
- Export: chunked streaming, stable header order, field normalization

## 3. API
- Base: /api
- Auth: (future) Sanctum or token
- Error spec: 4xx/5xx => {message, errors?}
- Users endpoints: see ./api/users.md

## 4. Non-Functional
- Security: no raw SQL, validation on all inputs, mass assignment protection, CSRF, CORS
- Performance: pagination, chunked export, queued import
- Reliability: transactions for bulk ops, idempotency for imports
- Observability: structured logs, audit for critical ops

## 5. Operations
- Envs via .env, secrets not logged
- DB migrations/seeds
- CI: lint/typecheck/build (FE), phpunit/pint (BE)

## 6. UX Guidelines
- Field-level validation, loading/empty/error states
- Accessible components, keyboard operable, contrast AA

## 7. Roadmap
- Admin points API
- OpenAPI generation + typed client
- Background import queue
- Filters/sorting in list API
