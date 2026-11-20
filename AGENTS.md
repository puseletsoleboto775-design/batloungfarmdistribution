# Batloung Farm Distribution

Fruit distribution system for Batloung Farm: a React frontend (repo root) and an Express + MySQL API in `backend/`.

## Layout

- `src/main.tsx`, `src/App.tsx` - React entrypoint and all pages and modals
- `src/api.ts` - typed client for the backend API (all `fetch` calls live here)
- `src/index.css` - global styles, Tailwind CSS v4 import first
- `vite.config.ts` - React + Tailwind plugins, `@` alias, and a dev proxy that sends `/api` to `http://localhost:5000`
- `backend/` - Express API (`src/routes`, `controllers`, `models`, `middleware`) and `database/schema.sql`
- `.mise.toml` - Node and pnpm versions

## Running

1. Load `backend/database/schema.sql` into MySQL, copy `backend/.env.example` to `backend/.env`, then `cd backend && npm install && npm run dev` (port 5000).
2. In the repo root: `pnpm install && pnpm dev` (port 5173). `pnpm typecheck` checks the TypeScript.

## Notes

- The API wraps responses as `{ success, data }`; rows use snake_case column names.
- Stock is tracked per fruit and package size (SMALL, MEDIUM, LARGE). Sales lock stock rows and roll back entirely if any item is short.
- Global element styles in `src/index.css` belong inside `@layer base` so Tailwind utilities can override them.
