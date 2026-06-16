# Wasted Miles — Supabase backend

Postgres schema + RLS + reverse-auction RPCs + edge functions for the
Blackpool-geofenced airport-transfer marketplace.

## Layout
```
supabase/
  migrations/
    0001_schema.sql     enums, tables (profiles, jobs, bids, locations, payments), guardrails
    0002_rls.sql        Row Level Security — blind bidding, verification + geofence gating
    0003_auction.sql    place_bid / buy_it_now / settle_job / complete_job (arbitrage)
  functions/
    match-drivers/      proximity dispatch (Haversine + buffer + targeted alerts)
    settle-escrow/      Stripe Connect escrow (authorize cap -> release payout)
```

## Deploy
```bash
supabase db push                       # apply migrations
supabase functions deploy match-drivers
supabase functions deploy settle-escrow
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

## How the core rules are enforced

- **Triple licensing lock / geofence** — `jobs` carries `licensing_authority`
  (enum `Blackpool|Wyre|Fylde`); the `enforce_job_guardrails` trigger rejects
  any non-Blackpool job in Phase 1. Drivers only see jobs in their authority.
- **Driver verification** — `driver_eligible_for_job()` requires
  `driver_verified = true`; the `jobs_driver_browse` RLS policy hides the whole
  marketplace from unverified drivers and `place_bid` refuses their bids.
- **Blind reverse auction** — `bids` has a select policy of `driver_id =
  auth.uid()` and **no** insert/update policy, so no one can read others' bids
  and all writes must go through the `SECURITY DEFINER` RPCs. Operators have no
  bid visibility at all; a job simply shows as pending at their cap.
- **Bid rules** — `place_bid` enforces `0 < amount <= cap` and
  `amount < current lowest` (can only go lower, never above the cap).
- **Arbitrage** — `settle_job` awards the lowest bid, stamps
  `arbitrage_spread = cap - winning_bid`, and writes the escrow `payments` row.
- **Subscription tiers** — the guardrail trigger blocks `vehicle_subcategory`
  unless the operator is `premium`; `vehicle_matches()` implements broad (Tier 1)
  vs precise (Tier 2) matching incl. "saloons can't fulfil estate requests" and
  the 8-seat minibus cap.
- **Escrow** — operator charged the full cap on settlement (`authorize`), driver
  paid their winning bid on completion (`release`); platform keeps the spread.

## Frontend wiring
Point the SPA's data layer at this backend with `VITE_API_URL` / `VITE_AUTH_API_URL`
(use Supabase Auth + PostgREST/RPC). The stores in `src/lib/*` already gate on
`hasBackend()` and post to the API when configured. Replace `api/auth.ts` (demo)
with Supabase Auth.
```
