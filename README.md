# Batloung Farm Distribution

A fruit distribution system: a React dashboard (this folder) backed by an Express + MySQL API (`backend/`).

## Run it

1. **Database.** Install MySQL 8 and run `backend/database/schema.sql` (safe to run more than once).
2. **API.**
   ```
   cd backend
   cp .env.example .env     # then enter your MySQL password
   npm install
   npm run dev              # http://localhost:5000, check /api/health
   ```
3. **Frontend.** In this folder:
   ```
   pnpm install             # or npm install
   pnpm dev                 # http://localhost:5173
   ```
   The dev server proxies `/api` to the API, so no extra setup is needed. If the API runs elsewhere, set `VITE_API_PROXY` (dev) or `VITE_API_URL` (build).

See `backend/README.md` for the list of API endpoints.
