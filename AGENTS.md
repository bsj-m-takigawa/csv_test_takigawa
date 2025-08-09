# Repository Guidelines

## Project Structure & Module Organization
- `backend/` (Laravel 10 API): routes in `routes/api.php`, app code in `app/`, config in `config/`, tests in `tests/{Feature,Unit}`.
- `frontend/` (Next.js + TypeScript): source in `src/`, static assets in `public/`.
- `docs/`: reports, issues, and system notes. `test-data/` and CSV generators live at repo root.
- `docker-compose.yml`: spins up MySQL, Redis, Laravel backend (8000), and Next.js frontend (3000).

## Build, Test, and Development Commands
- Compose: `docker-compose up -d` — start DB, Redis, backend, frontend.
- Backend dev: `cd backend && composer install && php artisan serve` (or use Compose). Assets: `npm run dev` (Vite) if you touch Blade assets.
- Backend tests: `cd backend && composer test` — run PHPUnit (SQLite in-memory per `phpunit.xml`).
- Backend style: `cd backend && composer pint` — apply Laravel Pint (PSR-12).
- Frontend dev: `cd frontend && npm i && npm run dev` — start Next.js on 3000.
- Frontend build: `cd frontend && npm run build && npm start`.
- Frontend quality: `npm run lint`, `npm run typecheck`, `npm run format[:check]`.

## Coding Style & Naming Conventions
- PHP (Laravel): follow PSR-12 via Pint; classes `StudlyCase`, methods/vars `camelCase`; controllers end with `Controller`.
- TS/React: 2-space indent, semicolons, width 100, trailing commas (per `.prettierrc.json`); components `PascalCase`, files under `src/` use `kebab-case` or match component name.
- Keep functions small; prefer explicit names; avoid unused `any` unless intentional (ESLint relaxes some TS rules here).

## Testing Guidelines
- Backend: PHPUnit in `backend/tests/Feature|Unit`; name tests `SomethingTest.php`. Use model factories and HTTP test helpers. Run with `composer test`.
- Frontend: no test harness is configured; at minimum ensure `lint` and `typecheck` pass before PR. Add tests if introducing complex UI logic.

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits (e.g., `feat: …`, `fix: …`, `docs: …`). Keep messages imperative and scoped.
- PRs: include summary (what/why), linked issues (`#123`), screenshots for UI changes, and notes on performance impact (CSV paths). Ensure CI checks, backend tests, and frontend lint/typecheck pass; update `docs/` when behavior changes.

## Security & Configuration Tips
- Never commit secrets. Copy `backend/.env.example` to `.env`. Frontend uses `NEXT_PUBLIC_API_URL` (see Compose) to reach the API.
