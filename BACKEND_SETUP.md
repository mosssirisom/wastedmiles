# Wasted Miles Backend Setup

This branch adds the first real backend foundation for Wasted Miles using Supabase.

## What this backend supports

- Verified operator accounts
- Operator team members and roles
- Airports / airport regions
- Live marketplace journeys
- Empty return journeys
- Urgent cover requests
- Journey claims
- Operator-to-operator conversations
- Messages
- Operator verification documents
- Row Level Security policies
- Atomic claim / accept / complete journey workflows

## 1. Create / open your Supabase project

In Supabase, create a project for Wasted Miles and copy:

- Project URL
- anon public key

Add them to `.env.local` locally and to Vercel environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Apply the database migrations

Run the SQL files in:

```bash
supabase/migrations/
```

Current migrations:

```bash
20260619100000_backend_foundation.sql
20260619105000_marketplace_workflow_functions.sql
```

You can apply them through the Supabase SQL editor or through the Supabase CLI.

## 3. Authentication

Use Supabase Auth email/password for the first version. The app-side helpers are in:

```bash
src/lib/authService.ts
```

## 4. App data layer

The browser Supabase client is in:

```bash
src/lib/supabase.ts
```

The marketplace service functions are in:

```bash
src/lib/marketplaceService.ts
```

Current helper functions:

- `listMarketplaceRegions()`
- `listOperators()`
- `createOperator()`
- `postJourney()`
- `claimJourney()`
- `acceptJourneyClaim()`
- `completeJourney()`

## 5. Recommended next implementation step

Wire the existing screens to the new service layer in this order:

1. Sign-in / account creation
2. Operator creation and verification status
3. Marketplace read from `listMarketplaceRegions()`
4. Post journey form to `postJourney()`
5. Claim button to `claimJourney()`
6. Dispatcher claims inbox to `acceptJourneyClaim()`
7. Messaging screens to `conversations` and `messages`

## Important note

The migration includes secure defaults using RLS. Operators can only update their own journeys, members can only read relevant conversations/messages, and only verified operators can post or claim marketplace work.
