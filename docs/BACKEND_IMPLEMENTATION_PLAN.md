# Backend Implementation Plan

## Done in this branch

- Supabase migration with core marketplace tables
- RLS policies for operators, journeys, claims, conversations and documents
- Airport seed data
- Typed Supabase browser client
- Auth helper functions
- Marketplace service layer
- Empty-leg matching helper
- Environment variable documentation
- Atomic marketplace workflow functions:
  - `claim_journey_atomic()`
  - `accept_journey_claim()`
  - `complete_journey()`

## Next code tasks

1. Replace mock `fetchRegions()` with `listMarketplaceRegions()` when Supabase is configured.
2. Wire `SignInScreen` to `authService.ts`.
3. Wire `JoinScreen` to `createOperator()`.
4. Wire `PostJourneyScreen` to `postJourney()`.
5. Wire `JourneyDetail` claim CTA to `claimJourney()`.
6. Add a dispatcher claims inbox so posting operators can accept/decline incoming claims.
7. Wire dashboard to `findEmptyLegMatches()` and marketplace metrics.

## Data model priorities

- Operators are the centre of the system.
- Users belong to operators through `operator_members`.
- Journeys are posted by operators and optionally claimed by another operator.
- Claims allow an operator to ask for work before the posting operator accepts.
- Accepting a claim now creates a conversation between both operators.
- Conversations/messages are scoped to participating operators.
- Verification documents support the trust layer before operators are allowed to post/claim work.
