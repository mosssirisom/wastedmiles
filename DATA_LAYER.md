# Data & Auth Layer

The app runs fully offline today (mock data + `localStorage`). This document
describes the seams added to connect a real backend without rewriting the UI.

## Modules

| Module | Responsibility |
| --- | --- |
| `src/lib/api.ts` | Central fetch client. Base URL from `VITE_API_URL`, injects the auth bearer token, `get/post/patch`. `hasBackend()` gates online behaviour. |
| `src/lib/auth.tsx` | `AuthProvider` + `useAuth()` — `user`, `token`, `signIn(email)`, `signOut()`. Persists to `localStorage`; calls `VITE_AUTH_API_URL` (default `/api/auth`) with a local demo fallback. |
| `src/lib/persist.ts` | `localStorage` JSON helpers. |
| `src/lib/claims.ts` | Claimed journeys store. Persists locally; `POST /claims` when a backend is configured. |
| `src/lib/messages.ts` | Message threads store. Persists locally; `POST /threads/:id/messages` when configured (simulated replies only in local mode). |
| `src/lib/notifications.ts` | Notifications store + simulated live feed. |
| `src/data/marketplace.ts` | `fetchRegions()` — regions/journeys from `VITE_MARKETPLACE_API_URL`, mock fallback. |

## Serverless stubs (Vercel `/api`)

- `api/auth.ts` — demo sign-in, returns `{ token, user }`. **Replace with real auth.**
- `api/signup.ts` — operator signup capture.
- `api/action.ts` — claim / message / operator action logging.

All three log to Vercel function logs and optionally forward to a webhook.

## To connect a backend

1. Set `VITE_API_URL` to your API base.
2. Implement: `POST /claims`, `GET /claims`, `POST /threads/:operatorId/messages`,
   `GET /threads`, `GET /notifications`, plus the regions endpoint.
3. Replace `api/auth.ts` with real authentication (JWT/session, OTP or password)
   backed by a users table; have it return `{ token, user }`.
4. (Optional) Swap the local stores' reads to hydrate from the API on sign-in
   and subscribe to live updates (polling or websockets) for messages and
   notifications.

## Env vars

See `.env.example` — `VITE_API_URL`, `VITE_AUTH_API_URL`,
`VITE_MARKETPLACE_API_URL`, `VITE_SIGNUP_API_URL`, `VITE_ACTIONS_API_URL`,
and their server-side webhook counterparts.
