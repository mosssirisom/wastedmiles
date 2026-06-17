import { useEffect, useState } from 'react'
import { api, hasBackend } from '../lib/api'
import { loadJSON, saveJSON } from '../lib/persist'
import { useJobs, postJob, type PostedJob, type JobStatus } from '../lib/jobsStore'
import { useMessages } from '../lib/messages'
import {
  REGIONS,
  OPERATORS,
  OPERATOR_IDS,
  regionMetrics,
  marketplaceTotals,
  formatGBP,
  buildRecentClaims,
} from '../data/marketplace'

// -----------------------------------------------------------------------------
// Relay data layer — backed by the real marketplace backend.
//
// The Relay screens render the same view-model shapes as before, but the data
// now comes from the shared backend stores instead of local mocks:
//   - Map / network   -> REGIONS + marketplaceTotals + jobsStore (live jobs)
//   - Bid             -> jobsStore market jobs + recent claim activity
//   - Messages        -> OPERATORS catalog + useMessages thread store
//   - Request Cover   -> jobsStore.postJob (real blind-auction job)
//   - Profile         -> data layer (api when VITE_API_URL is set, else cache)
//
// Every store already routes through the env-gated `api` client, so setting
// VITE_API_URL switches Relay onto the real HTTP/Supabase backend unchanged.
// -----------------------------------------------------------------------------

export interface Airport {
  code: string
  lat: number
  lng: number
  jobs: number
  rev: string
  primary?: boolean
}
export interface RelayRoute {
  from: string
  to: string
}
export interface Opportunity {
  id: string
  route: string
  price: string
}
export interface NetworkSnapshot {
  airports: Airport[]
  routes: RelayRoute[]
  totalJobs: number
  available: string
  opportunities: Opportunity[]
}

export interface BidRow {
  name: string
  note: string
  amount: string
}
export interface BidDetail {
  from: string
  to: string
  buyNow: string
  highestBid: string
  timeline: BidRow[]
  // live job handle for placing actions (undefined when no market job exists)
  jobId?: string
  status?: JobStatus
  cap?: number
  myBid?: number
}

export interface Thread {
  id: string
  name: string
  preview: string
}

export interface Profile {
  fleetName: string
  email: string
  phone: string
}

export interface CoverRequest {
  date: string
  pickup: string
  dropoff: string
  tier: string
  offer: string
}

// The four hotspots Relay renders, drawn from the real region catalogue.
const HOTSPOT_CODES = ['MAN', 'LPL', 'BHX', 'LHR'] as const
const PRIMARY_CODE = 'LHR'
const RELAY_ROUTES: RelayRoute[] = [
  { from: 'LHR', to: 'MAN' },
  { from: 'MAN', to: 'LPL' },
  { from: 'MAN', to: 'BHX' },
  { from: 'BHX', to: 'LHR' },
  { from: 'LPL', to: 'LHR' },
]

function buildOpportunities(jobs: PostedJob[]): Opportunity[] {
  const fromJobs: Opportunity[] = jobs
    .slice(0, 3)
    .map((j) => ({ id: j.id, route: `${j.fromName} → ${j.to}`, price: formatGBP(j.cap) }))
  if (fromJobs.length >= 3) return fromJobs
  const fill: Opportunity[] = REGIONS.flatMap((r) =>
    r.journeys.map((j) => ({ id: j.id, route: `${r.name} → ${j.to}`, price: formatGBP(j.value) }))
  )
  return [...fromJobs, ...fill].slice(0, 3)
}

// Reactive: re-renders when jobs change (e.g. after Request Cover posts one).
export function useNetwork(): NetworkSnapshot {
  const { jobs, market } = useJobs()

  const airports: Airport[] = HOTSPOT_CODES.map((code) => {
    const region = REGIONS.find((r) => r.code === code)!
    const m = regionMetrics(region)
    return {
      code,
      lat: region.center[0],
      lng: region.center[1],
      jobs: m.opportunities,
      rev: formatGBP(m.revenue),
      primary: code === PRIMARY_CODE,
    }
  })

  const totals = marketplaceTotals(REGIONS)
  const extraValue = jobs.reduce((sum, j) => sum + j.cap, 0)

  return {
    airports,
    routes: RELAY_ROUTES,
    totalJobs: totals.opportunities + jobs.length,
    available: formatGBP(totals.revenue + extraValue),
    opportunities: buildOpportunities(market),
  }
}

// Reactive: the live market job a driver can bid on, plus real claim activity.
// (Competing bids stay hidden — this is a blind reverse auction — so the
// timeline is sourced from recent settled claim activity across the network.)
export function useBid(): BidDetail {
  const { market } = useJobs()
  const top = market[0]

  const timeline: BidRow[] = buildRecentClaims(REGIONS)
    .slice(0, 4)
    .map((c) => ({
      name: OPERATORS[c.operatorId]?.name ?? 'Operator',
      note: c.ago,
      amount: formatGBP(c.value),
    }))

  if (!top) {
    return { from: '—', to: '—', buyNow: '—', highestBid: '—', timeline }
  }
  return {
    from: top.fromCode,
    to: top.to.toUpperCase(),
    buyNow: formatGBP(top.cap),
    highestBid: formatGBP(top.myBid ?? Math.round(top.cap * 0.8)),
    timeline,
    jobId: top.id,
    status: top.status,
    cap: top.cap,
    myBid: top.myBid,
  }
}

function journeyPreview(operatorId: string): string {
  for (const region of REGIONS) {
    const j = region.journeys.find((jj) => jj.operatorId === operatorId)
    if (j) return `${region.code} → ${j.to} · ${formatGBP(j.value)}`
  }
  return 'No recent activity'
}

// Reactive: operator conversations with live message previews.
export function useThreads(): Thread[] {
  const { getThread } = useMessages()
  return OPERATOR_IDS.slice(0, 4).map((id) => {
    const op = OPERATORS[id]
    const msgs = getThread(id)
    const last = msgs[msgs.length - 1]
    return {
      id,
      name: op.name,
      preview: last ? last.text : journeyPreview(id),
    }
  })
}

// Request Cover posts a real job into the blind-auction engine (which routes
// to the backend when VITE_API_URL is set, otherwise simulates locally).
export async function requestCover(input: CoverRequest): Promise<void> {
  const offer = Number(input.offer.replace(/[^0-9.]/g, '')) || 70
  postJob({
    fromCode: 'BPL',
    fromName: input.pickup || 'Blackpool',
    to: input.dropoff || 'Manchester Airport',
    vehicle: 'standard',
    passengers: 1,
    luggage: 1,
    pickupAt: new Date().toISOString(),
    cap: offer,
  })
}

// --- Profile (still served by the env-gated data client) ---------------------

const PROFILE_KEY = 'relay-profile'
const MOCK_PROFILE: Profile = {
  fleetName: 'Blackpool Executive',
  email: 'ops@blackpool-exec.co.uk',
  phone: '07700 900482',
}
const delay = (ms = 320) => new Promise((r) => setTimeout(r, ms))

export async function fetchProfile(): Promise<Profile> {
  if (hasBackend()) {
    const data = await api.get<Profile>('/relay/profile')
    saveJSON(PROFILE_KEY, data)
    return data
  }
  await delay()
  return loadJSON<Profile>(PROFILE_KEY, MOCK_PROFILE)
}

export async function saveProfile(input: Profile): Promise<void> {
  saveJSON(PROFILE_KEY, input)
  if (hasBackend()) await api.post('/relay/profile', input).catch(() => {})
}

// --- tiny async hook (used by the Profile read) ------------------------------

export function useResource<T>(loader: () => Promise<T>): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    loader()
      .then((d) => alive && setData(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // loader references are module-level constants (stable); run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { data, loading }
}
