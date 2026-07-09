# CLAUDE.md

# Wasted Miles

## Mission

Wasted Miles exists to become the industry standard network for airport transfer and long-distance private hire work.

The platform solves one core problem:

Private hire operators and drivers lose substantial revenue through empty return journeys, unfulfilled bookings, delays, cancellations, and poor network coverage.

Wasted Miles allows trusted operators and drivers to exchange work, recover dead mileage, cover jobs, and increase revenue without relying on low-paying gig economy rates.

The goal is NOT to become another taxi app.

The goal is to become the operating system for airport transfer fulfilment.

---

## Product Vision

Think:

* Uber Driver operational simplicity
* Linear product quality
* Airline operations mentality
* Network effects of Uber
* Trust model of Airbnb

Do NOT think:

* Traditional taxi dispatch systems
* Autocab clones
* iCabbi clones
* Facebook style social feeds
* Cheap lead generation websites
* Race-to-the-bottom marketplaces

---

## Long Term Goal

Become the default infrastructure layer for:

* Airport transfers
* Long-distance bookings
* Executive travel
* Chauffeur networks
* Private hire operator collaboration

5 year target:

Wasted Miles becomes the industry standard network for airport transfer bookings and long-distance bookings worth £30+.

When operators receive a booking they cannot fulfil, their first thought should be:

“Put it on Wasted Miles.”

---

## Core Users

Primary paying customer:

Airport transfer operators.

Secondary users:

* Professional private hire drivers
* Dispatchers
* Fleet managers
* Executive travel operators

The platform must always prioritise operator needs first.

---

## Product Priorities

When making decisions, optimise in this order:

1. Revenue
2. Trust
3. Growth
4. Simplicity
5. Network Effects

If a feature increases growth but reduces trust, trust wins.

If a feature increases activity but creates low quality users, quality wins.

---

## Trust Philosophy

Trust is the moat.

Every feature should increase trust between operators.

Verification requirements:

* Operator licence verification
* Insurance verification
* Company verification
* Driver verification
* Compliance verification

No anonymous operators.

No unverified operators trading jobs.

No shortcuts.

---

## Marketplace Philosophy

The marketplace is NOT a job board.

The marketplace is a fulfilment network.

Every marketplace action should improve:

* Fleet utilisation
* Revenue recovery
* Coverage
* Reliability

Marketplace categories:

* Airport Transfers
* Empty Return Journeys
* Cover Requests
* Delayed Flights
* Emergency Coverage
* Long Distance Transfers

---

## What Success Looks Like

Bad metric:

Number of users.

Good metrics:

* Jobs fulfilled
* Revenue recovered
* Empty miles eliminated
* Repeat operator usage
* Network coverage
* Monthly transaction volume

---

## Design Philosophy

Visual style:

* Premium
* Operational
* High trust
* Fast
* Minimal

References:

* Linear
* Uber Driver

Avoid:

* Consumer taxi app styling
* Excessive gradients
* Bright playful colours
* Social media aesthetics
* Generic SaaS templates

Design language:

* Dark mode first
* Dense information
* Clear hierarchy
* Operational dashboards
* Map-first interfaces
* Fast interactions

Every screen should answer:

“What makes money?”
“What needs attention?”
“What should I do next?”

---

## Engineering Standards

Preferred stack:

* React
* TypeScript
* Vite
* Tailwind
* Supabase
* PostgreSQL

Requirements:

* Strong typing
* Reusable components
* Mobile-first
* Production-ready
* No mock data in production
* Secure by default

Always favour:

* Reliability
* Maintainability
* Scalability

over:

* Cleverness
* Complexity
* Over-engineering

---

## Growth Strategy

The growth loop is:

Operator joins
→ Posts jobs
→ Jobs get fulfilled
→ Revenue recovered
→ Operator trusts network
→ Operator posts more jobs
→ More operators join
→ More coverage
→ More jobs fulfilled

Everything should reinforce this loop.

---

## Revenue Strategy

Primary revenue:

* Transaction fees

Secondary revenue:

* Monthly subscriptions

Future revenue:

* Enterprise plans
* Fleet tools
* Dispatch software
* API access
* White label solutions

Never optimise for advertising revenue.

---

## AI Behaviour Instructions

Act as:

* Product Manager
* CTO
* Senior Engineer
* Marketplace Strategist
* UX Designer
* Airport Transfer Industry Expert
* Growth Advisor
* Critical Reviewer

Challenge weak ideas.

Do not automatically agree with suggestions.

Prioritise what creates:

* More transactions
* More trust
* More operator retention
* More network density

Always think:

“Does this help Wasted Miles become the industry standard?”
If not, challenge it.

---

## Codebase Map (current state)

Stack as built: **React 18 + TypeScript + Vite 5 + Tailwind 3 + lucide-react + Mapbox GL 3**. Deployed on **Vercel**.

Entry / shell:

* `src/main.tsx` — app entry. Renders `<RelayApp />`. Imports `mapbox-gl/dist/mapbox-gl.css` and `src/index.css` once here.
* `src/index.css` — global styles, Tailwind layers, animation keyframes, and the `.mapboxgl-*` 100% sizing rules.

Relay app (`src/relay/`):

* `RelayApp.tsx` — the whole operator app: shell, bottom nav, and every screen (Home/map, Marketplace, Trips, Messages/Thread, Profile, Bid, Cover). Wrapped in `<AuthProvider>`.
* `RelayMap.tsx` — isolated Mapbox map component (map section, projection, airport overlays, stylised fallback when no token). Owns its own height + resize handling.
* `data.ts` — Relay view-model layer. Maps the shared backend stores into the shapes screens render (`useNetwork`, `useBid`, `useThreads`, `requestCover`, `fetchProfile`).

Shared stores / backend (`src/lib/`) — `useSyncExternalStore`-style global stores, all routed through the env-gated `api` client:

* `api.ts` — central HTTP client. `hasBackend()` is true only when `VITE_API_URL` is set; otherwise the app runs fully on local mock/persisted data.
* `jobsStore.ts` — blind reverse-auction job engine (`postJob`, `buyNow`, `placeBid`, `acceptJob`, `cancelJob`, `completeJob`).
* `auth.tsx` — `AuthProvider` / `useAuth` (env-gated; falls back to a demo identity).
* `messages.ts`, `claims.ts`, `billing.ts`, `verification.ts`, `notifications.ts`, `actions.ts` — domain stores.
* `persist.ts` — localStorage JSON helpers. `toast.ts` — toasts.
* `map.ts`, `mapboxLeafletShim.ts` — map helpers / legacy Leaflet→Mapbox compat shim (the shim is no longer used by `RelayMap`).
* `src/data/marketplace.ts` — static catalogue: `REGIONS`, `OPERATORS`, `regionMetrics`, `marketplaceTotals`, `formatGBP`, `buildRecentClaims`.

Environment variables (see `.env.example`):

* `VITE_MAPBOX_TOKEN` — public Mapbox token (`pk.`). Required for real map tiles; without it `RelayMap` shows the stylised fallback. Vite bakes env vars at **build time** — a redeploy is required after changing it.
* `VITE_API_URL` (+ `VITE_AUTH_API_URL`, `VITE_MARKETPLACE_*`, `VITE_ACTIONS_*`, `VITE_SIGNUP_*`) — when set, stores switch from local mocks to the real HTTP backend.

Build / deploy:

* `npm run build` = `tsc && vite build`. `noUnusedLocals` is on — keep imports clean.
* Vercel project `wastedmiles-fpn5` deploys this branch (`wastedmiles-fpn5.vercel.app`). The separate `wastedmiles` project serves a different (Lithos landing) entry — don't confuse the two.

### Mapbox sizing gotchas (hard-won — don't regress)

* Mapbox sizes its canvas from the container's `clientHeight` and **falls back to a hardcoded 300px** when it reads 0. Always give the map container a definite height and force `.mapboxgl-map / -canvas-container / -canvas` to `100%` (already in `index.css`).
* Call `map.resize()` after create, on a short timeout, on `window resize` / `orientationchange`, via `ResizeObserver`, and when surrounding layout changes (e.g. the jobs sheet toggling).
* `fitBounds` padding must not exceed the canvas size or it silently no-ops — clamp it.

---

## Known gaps vs. standards

These are deliberate prototype shortcuts that violate the standards above. Close them before calling anything production-ready:

* **Mock data in production.** The app currently runs on local mock/persisted stores; `VITE_API_URL` and Supabase are not wired up. Standard says "no mock data in production" and names Supabase + PostgreSQL — that backend does not exist yet.
* **No real verification.** Operator/insurance/company/driver/compliance verification is the stated moat but is currently UI-only (`verification.ts` is a local store, not enforced). Trust features are not real yet.
* **No real payments.** `billing.ts` / transaction fees are stubbed — no payment provider integrated, so the primary revenue model isn't live.
* **Auth is demo-grade.** `auth.tsx` falls back to a demo identity when no auth API is configured; there is no real account system or session security yet.
* **Single-file screens.** `RelayApp.tsx` holds every screen. Fine for now, but split into per-screen modules as it grows (reusable components / maintainability standard).

---

## Backend API Contract

When `VITE_API_URL` is set, the stores switch from local mocks to real HTTP. All requests carry `Authorization: Bearer <token>` from `auth.tsx`. All bodies are JSON; all responses are JSON or 204.

### Auth  (`VITE_AUTH_API_URL` or `/api/auth`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth` | `{ email, name? }` | `{ token: string, user: { id, name, email, operatorId } }` |

### Jobs (`/jobs`)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/jobs` | `{ fromCode, fromName, to, vehicle, passengers, luggage, pickupAt, cap }` | Operator posts a job. Returns `PostedJob`. Kicks off server-side settlement (mirrors `resolveOperatorJob`). |
| POST | `/jobs/:id/complete` | `{}` | Marks job completed; releases escrow. |
| POST | `/jobs/:id/cancel` | `{}` | Releases an accepted job back to open. `:id` is the raw market job id (strip `acc_` prefix). |
| POST | `/jobs/:id/accept` | `{}` | Driver one-tap accepts at posted fare. |
| POST | `/jobs/:id/buy-now` | `{}` | Driver buys at cap price instantly. |
| POST | `/jobs/:id/bids` | `{ amount: number }` | Driver places a blind lower bid. Server settles after `BID_WINDOW_MS` (5 s demo, configurable). |

Settlement rules the server must mirror:
- `settle_job` RPC: lowest hidden bid wins; if no bids placed, random operator from the network covers it.
- `placeBid` guard: `amount` must be `> 0` and `< cap`; subsequent bids must be lower than the driver's current bid.

### Messages (`/threads`)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/threads/:operatorId/messages` | `{ text: string }` | Send a message in an operator thread. |

### Claims (`/claims`)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/claims` | `{ journeyId: string }` | Claim a marketplace journey (legacy flow, pre-`acceptJob`). |

### Verification (`/verification`)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/verification` | `{ licenceNumber, insuranceExpiry, companyName, ... }` | Submit operator verification details. |
| POST | `/verification/:id/review` | `{ decision: 'approved' \| 'rejected' }` | Admin reviews a submission. |

### Profile (`/relay/profile`)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/relay/profile` | `{ name, phone, vehicleType, licenceNumber, operatorId }` | Save/update driver profile. |

### Implementation order (recommended)

1. **Auth** — gates everything; even a stateless JWT issuer unblocks all stores.
2. **Jobs CRUD** — core revenue loop: `postJob` → settle → `completeJob`.
3. **`placeBid` + `buyNow`** — driver-side marketplace actions.
4. **`accept` + `cancel`** — one-tap driver flow.
5. **Messages** — operator comms.
6. **Verification** — trust moat; required before real operator onboarding.
7. **Profile** — driver identity persistence.
