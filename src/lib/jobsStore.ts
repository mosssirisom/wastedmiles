import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'
import { hasBackend, api } from './api'
import { notify } from './notifications'
import { OPERATORS, REGIONS } from '../data/marketplace'

// Two-sided jobs store.
//  - source 'me'     : journeys the signed-in operator posted (auto-settled
//                      by simulated drivers in demo mode).
//  - source 'market' : journeys posted by other operators that a DRIVER can
//                      cover via Buy-It-Now or a blind lower bid.
// The blind reverse-auction mirrors the Supabase RPCs (settle_job): the
// lowest hidden bid wins and the operator only ever sees their cap.

export type JobStatus =
  | 'pending'
  | 'covered'
  | 'completed'
  | 'open'
  | 'bidding'
  | 'won'
  | 'lost'
  | 'expired'
  | 'accepted'

export interface PostedJob {
  id: string
  source: 'me' | 'market'
  fromCode: string
  fromName: string
  to: string
  vehicle: 'standard' | 'large'
  passengers: number
  luggage: number
  pickupAt: string // ISO
  cap: number
  status: JobStatus
  driverName?: string // who covered / won
  myBid?: number // the current driver's bid
  createdAt: number
}

const KEY = 'wm-jobs'
const DRIVERS = Object.values(OPERATORS).map((o) => o.name)
const RESOLVE_MS = 7000
const BID_WINDOW_MS = 5000

function seedMarket(): PostedJob[] {
  const picks = REGIONS.flatMap((r) => r.journeys.map((j) => ({ r, j })))
    .filter(({ j }) => j.status === 'available')
    .slice(0, 6)
  return picks.map(({ r, j }, i) => ({
    id: `mk_${i}_${j.id}`,
    source: 'market' as const,
    fromCode: r.code,
    fromName: r.name,
    to: j.to,
    vehicle: j.passengers > 4 ? ('large' as const) : ('standard' as const),
    passengers: j.passengers,
    luggage: j.luggage,
    pickupAt: new Date(Date.now() + (2 + i) * 3600 * 1000).toISOString(),
    cap: j.value,
    status: 'open' as const,
    createdAt: Date.now(),
  }))
}

const items: PostedJob[] = loadJSON<PostedJob[]>(KEY, [])
if (items.length === 0) {
  items.push(...seedMarket())
  saveJSON(KEY, items)
}

const listeners = new Set<() => void>()
let version = 0
function emit() {
  version++
  saveJSON(KEY, items)
  listeners.forEach((l) => l())
}

// --- operator side -----------------------------------------------------------
function resolveOperatorJob(id: string) {
  const job = items.find((j) => j.id === id)
  if (!job || job.status !== 'pending') return
  job.status = 'covered'
  job.driverName = DRIVERS[Math.floor(Math.random() * DRIVERS.length)]
  notify('claim', 'Your job was covered', `${job.fromCode} → ${job.to} · covered by ${job.driverName}`)
  emit()
}

export function postJob(
  input: Omit<PostedJob, 'id' | 'source' | 'status' | 'createdAt' | 'driverName' | 'myBid'>
): PostedJob {
  const job: PostedJob = {
    ...input,
    id: `pj_${Date.now()}`,
    source: 'me',
    status: 'pending',
    createdAt: Date.now(),
  }
  items.unshift(job)
  emit()
  if (hasBackend()) api.post('/jobs', input).catch(() => {})
  else setTimeout(() => resolveOperatorJob(job.id), RESOLVE_MS)
  return job
}

// Release escrow on completion (driver paid winning bid, platform keeps spread).
export function completeJob(id: string) {
  const job = items.find((j) => j.id === id)
  if (!job || (job.status !== 'covered' && job.status !== 'accepted')) return
  job.status = 'completed'
  notify('system', 'Trip completed', `${job.fromCode} → ${job.to} · £${job.myBid ?? job.cap}`)
  emit()
  if (hasBackend()) api.post(`/jobs/${id}/complete`, {}).catch(() => {})
}

// One-tap accept of a specific marketplace job at its posted fare (no bidding).
// Idempotent per market job id.
export function acceptJob(input: {
  marketId: string
  fromCode: string
  fromName: string
  to: string
  vehicle: 'standard' | 'large'
  passengers: number
  luggage: number
  pickupAt: string
  cap: number
  driverName: string
}): PostedJob {
  const id = `acc_${input.marketId}`
  const existing = items.find((j) => j.id === id)
  if (existing) return existing
  const job: PostedJob = {
    id,
    source: 'market',
    fromCode: input.fromCode,
    fromName: input.fromName,
    to: input.to,
    vehicle: input.vehicle,
    passengers: input.passengers,
    luggage: input.luggage,
    pickupAt: input.pickupAt,
    cap: input.cap,
    status: 'accepted',
    driverName: input.driverName,
    myBid: input.cap,
    createdAt: Date.now(),
  }
  items.unshift(job)
  emit()
  if (hasBackend()) api.post(`/jobs/${input.marketId}/accept`, {}).catch(() => {})
  return job
}

// --- driver side -------------------------------------------------------------
function settleBid(id: string, driverName: string) {
  const job = items.find((j) => j.id === id)
  if (!job || job.status !== 'bidding') return
  // Simulated competing operator may undercut the blind bid.
  const outbid = Math.random() < 0.45
  if (outbid) {
    job.status = 'lost'
    job.driverName = DRIVERS[Math.floor(Math.random() * DRIVERS.length)]
  } else {
    job.status = 'won'
    job.driverName = driverName
  }
  emit()
}

export function buyNow(id: string, driverName: string) {
  const job = items.find((j) => j.id === id)
  if (!job || job.status !== 'open') return
  job.status = 'won'
  job.myBid = job.cap
  job.driverName = driverName
  emit()
  if (hasBackend()) api.post(`/jobs/${id}/buy-now`, {}).catch(() => {})
}

export function placeBid(id: string, amount: number, driverName: string) {
  const job = items.find((j) => j.id === id)
  if (!job || (job.status !== 'open' && job.status !== 'bidding')) return
  if (!(amount > 0) || amount >= job.cap) return // must be lower than the cap
  if (job.myBid != null && amount >= job.myBid) return // can only go lower
  job.myBid = amount
  job.status = 'bidding'
  emit()
  if (hasBackend()) api.post(`/jobs/${id}/bids`, { amount }).catch(() => {})
  else setTimeout(() => settleBid(id, driverName), BID_WINDOW_MS)
}

// Resume timers left over from a reload.
items.forEach((j) => {
  if (j.status === 'pending') {
    setTimeout(() => resolveOperatorJob(j.id), Math.max(500, RESOLVE_MS - (Date.now() - j.createdAt)))
  }
})

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function getSnapshot() {
  return version
}

export function useJobs() {
  useSyncExternalStore(subscribe, getSnapshot)
  return {
    jobs: [...items],
    posted: items.filter((j) => j.source === 'me'),
    market: items.filter((j) => j.source === 'market'),
    postJob,
    buyNow,
    placeBid,
    acceptJob,
    completeJob,
  }
}
