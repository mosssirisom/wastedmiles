import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'
import { hasBackend, api } from './api'
import { OPERATORS } from '../data/marketplace'

// Operator-posted jobs. In demo mode the blind reverse-auction is simulated
// locally (drivers bid invisibly, lowest wins) so an operator sees the full
// lifecycle. With a backend configured, posting calls the real RPCs instead.

export type PostedStatus = 'pending' | 'covered' | 'expired'

export interface PostedJob {
  id: string
  fromCode: string
  fromName: string
  to: string
  vehicle: 'standard' | 'large'
  passengers: number
  luggage: number
  pickupAt: string // ISO
  cap: number
  status: PostedStatus
  driverName?: string
  createdAt: number
}

const KEY = 'wm-posted'
const items: PostedJob[] = loadJSON<PostedJob[]>(KEY, [])
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  saveJSON(KEY, items)
  listeners.forEach((l) => l())
}

const DRIVERS = Object.values(OPERATORS).map((o) => o.name)
const RESOLVE_MS = 7000 // simulated bidding window before settlement

// Mirrors settle_job(): lowest blind bid wins; operator simply sees "covered".
function resolve(id: string) {
  const job = items.find((j) => j.id === id)
  if (!job || job.status !== 'pending') return
  job.status = 'covered'
  job.driverName = DRIVERS[Math.floor(Math.random() * DRIVERS.length)]
  emit()
}

export function postJob(
  input: Omit<PostedJob, 'id' | 'status' | 'createdAt' | 'driverName'>
): PostedJob {
  const job: PostedJob = { ...input, id: `pj_${Date.now()}`, status: 'pending', createdAt: Date.now() }
  items.unshift(job)
  emit()

  if (hasBackend()) {
    // Real flow: create the job; the backend broadcasts to drivers and settles.
    api.post('/jobs', input).catch(() => {})
  } else {
    setTimeout(() => resolve(job.id), RESOLVE_MS)
  }
  return job
}

// Resume any pending jobs left over from a reload.
items
  .filter((j) => j.status === 'pending')
  .forEach((j) => {
    const remaining = Math.max(500, RESOLVE_MS - (Date.now() - j.createdAt))
    setTimeout(() => resolve(j.id), remaining)
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

export function usePostedJobs() {
  useSyncExternalStore(subscribe, getSnapshot)
  return { jobs: [...items], postJob }
}
