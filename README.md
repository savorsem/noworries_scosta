# noworries_scosta

This app uses **Supabase Edge Functions** as the backend for chat/memory and **Gemini** is called server-side (no client API key).

## Local run

### Prerequisites
- Node.js

### Install

```bash
npm install
```

### Env
Create `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Example:

```bash
VITE_SUPABASE_URL=https://wfjuolmetsbddtzewqhv.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### Run

```bash
npm run dev
```

## Backend (Supabase)

Edge Functions used:
- `chat_send`
- `admin_set_provider_key`

> Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PIN_HASH`) are configured in Supabase Dashboard.
