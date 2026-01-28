# veo-studio

## Deploy

Vercel build: `vite build` output: `dist`

## Admin → Integrations

This project includes an **Admin Integrations** panel (passcode protected) to manage provider keys/tokens server-side.

### Required Vercel Environment Variables

- `ADMIN_PASSCODE` — passcode for the admin panel
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

Optional (client):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`

### Supabase

Run SQL migration:
- `supabase_migration_integrations.sql`

Notes:
- `integrations` table has RLS enabled and **no policies** by default (client cannot access).
- Serverless API uses Service Role key.

### API

- `GET /api/integrations` (admin)
- `POST /api/integrations` (admin)
- `POST /api/integrations/test` (admin)

Admin auth: send header `x-admin-passcode: <ADMIN_PASSCODE>`
