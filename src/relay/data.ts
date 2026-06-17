import { useEffect, useState } from 'react'
import { api, hasBackend } from '../lib/api'
import { loadJSON, saveJSON } from '../lib/persist'

// -----------------------------------------------------------------------------
// Relay data layer.
//
// Every Relay screen reads through this module instead of hardcoding values.
// All reads/writes go through the shared, env-gated `api` client:
//   - VITE_API_URL set   -> real HTTP calls to the backend, cached locally.
//   - VITE_API_URL unset -> seed/mock data (persisted to localStorage), so the
//                           prototype runs offline and stays identical in shape.
// Flipping on a real backend is therefore a config change, not a rewrite.
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

// --- seed data (used as both the offline source and the cache fallback) ------

const MOCK_NETWORK: NetworkSnapshot = {
  airports: [
    { code: 'MAN', lat: 53.365, lng: -2.272, jobs: 18, rev: '£4.2k' },
    { code: 'LPL', lat: 53.336, lng: -2.85, jobs: 9, rev: '£3.1k' },
    { code: 'BHX', lat: 52.454, lng: -1.748, jobs: 11, rev: '£4.2k' },
    { code: 'LHR', lat: 51.47, lng: -0.454, jobs: 14, rev: '£5.7k', primary: true },
  ],
  routes: [
    { from: 'LHR', to: 'MAN' },
    { from: 'MAN', to: 'LPL' },
    { from: 'MAN', to: 'BHX' },
    { from: 'BHX', to: 'LHR' },
    { from: 'LPL', to: 'LHR' },
  ],
  totalJobs: 247,
  available: '£42,300',
  opportunities: [
    { id: 'op_1', route: 'Manchester → Heathrow', price: '£180' },
    { id: 'op_2', route: 'Blackpool → Manchester Airport', price: '£90' },
    { id: 'op_3', route: 'Liverpool → Heathrow', price: '£210' },
  ],
}

const MOCK_BID: BidDetail = {
  from: 'LONDON',
  to: 'MANCHESTER',
  buyNow: '£70',
  highestBid: '£55',
  timeline: [
    { name: 'Smith driver', note: 'Late bids', amount: '£280' },
    { name: 'Frasch driver', note: '22:03 bid', amount: '£230' },
    { name: 'Erach driver', note: 'Blind Bid', amount: '£230' },
    { name: 'Jamo driver', note: 'Blind Bid', amount: '£230' },
  ],
}

const MOCK_THREADS: Thread[] = [
  { id: 't_1', name: 'Pennine Cars', preview: 'Can you confirm the 17:45 pickup?' },
  { id: 't_2', name: 'Mersey Premier', preview: 'Driver en route to LHR.' },
  { id: 't_3', name: 'Skyline Chauffeurs', preview: 'Thanks — accepted the cover.' },
]

const MOCK_PROFILE: Profile = {
  fleetName: 'Blackpool Executive',
  email: 'ops@blackpool-exec.co.uk',
  phone: '07700 900482',
}

// --- fetch helpers -----------------------------------------------------------

const KEY = {
  network: 'relay-network',
  bid: 'relay-bid',
  threads: 'relay-threads',
  profile: 'relay-profile',
}

// Simulated network latency so offline mode still exercises loading states.
const delay = (ms = 320) => new Promise((r) => setTimeout(r, ms))

async function read<T>(path: string, key: string, mock: T): Promise<T> {
  if (hasBackend()) {
    const data = await api.get<T>(path)
    saveJSON(key, data)
    return data
  }
  await delay()
  return loadJSON<T>(key, mock)
}

export const fetchNetwork = () => read('/relay/network', KEY.network, MOCK_NETWORK)
export const fetchBid = () => read('/relay/bid', KEY.bid, MOCK_BID)
export const fetchThreads = () => read('/relay/threads', KEY.threads, MOCK_THREADS)
export const fetchProfile = () => read('/relay/profile', KEY.profile, MOCK_PROFILE)

export async function requestCover(input: CoverRequest): Promise<void> {
  if (hasBackend()) {
    await api.post('/relay/cover', input).catch(() => {})
  }
  // Offline: nothing to persist server-side; the UI advances optimistically.
}

export async function saveProfile(input: Profile): Promise<void> {
  saveJSON(KEY.profile, input)
  if (hasBackend()) await api.post('/relay/profile', input).catch(() => {})
}

// --- tiny async hook ---------------------------------------------------------

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
