import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'
import { hasBackend, api } from './api'

// Driver verification (triple licensing lock) with an admin review queue.
// Drivers submit -> 'pending'; an admin approves/rejects. No auto-approve.
export type VerifStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type RequestStatus = 'pending' | 'verified' | 'rejected'

export interface VerificationDetails {
  phdNumber: string
  phdExpiry: string
  plate: string
  plateExpiry: string
  authority: string
  vehicleCategory: 'standard' | 'large'
  subcategory: '' | 'saloon' | 'estate' | 'executive' | 'minibus'
  passengerCapacity: number
  luggageCapacity: number
  badgeFile: string
  plateFile: string
}

export interface VerificationRequest {
  id: string
  name: string
  email: string
  details: VerificationDetails
  status: RequestStatus
  submittedAt: number
}

interface State {
  requests: VerificationRequest[]
  myId: string | null
}

const KEY = 'wm-verification'

function seed(): VerificationRequest[] {
  const base: VerificationDetails = {
    phdNumber: '',
    phdExpiry: '2027-04-01',
    plate: '',
    plateExpiry: '2027-04-01',
    authority: 'Blackpool',
    vehicleCategory: 'standard',
    subcategory: 'saloon',
    passengerCapacity: 4,
    luggageCapacity: 3,
    badgeFile: 'badge.jpg',
    plateFile: 'plate.jpg',
  }
  return [
    {
      id: 'vr_seed_1',
      name: 'A. Rahman',
      email: 'arahman@phcars.co.uk',
      details: { ...base, phdNumber: 'BPL-20841', plate: 'PH-4471' },
      status: 'pending',
      submittedAt: Date.now() - 1000 * 60 * 22,
    },
    {
      id: 'vr_seed_2',
      name: 'D. Lewis',
      email: 'd.lewis@coastexec.co.uk',
      details: { ...base, vehicleCategory: 'large', subcategory: 'minibus', passengerCapacity: 8, phdNumber: 'BPL-19330', plate: 'PH-8820' },
      status: 'pending',
      submittedAt: Date.now() - 1000 * 60 * 75,
    },
  ]
}

let state: State = loadJSON<State>(KEY, { requests: seed(), myId: null })
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  saveJSON(KEY, state)
  listeners.forEach((l) => l())
}

export function submitVerification(
  details: VerificationDetails,
  who: { name?: string; email?: string }
) {
  const req: VerificationRequest = {
    id: `vr_${Date.now()}`,
    name: who.name || 'You',
    email: who.email || '',
    details,
    status: 'pending',
    submittedAt: Date.now(),
  }
  state = { requests: [req, ...state.requests], myId: req.id }
  emit()
  if (hasBackend()) api.post('/verification', details).catch(() => {})
}

export function reviewVerification(id: string, decision: RequestStatus) {
  const req = state.requests.find((r) => r.id === id)
  if (!req) return
  req.status = decision
  emit()
  if (hasBackend()) api.post(`/verification/${id}/review`, { decision }).catch(() => {})
}

function myStatus(): VerifStatus {
  const r = state.requests.find((x) => x.id === state.myId)
  return r ? r.status : 'unverified'
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function getSnapshot() {
  return version
}

export function useVerification() {
  useSyncExternalStore(subscribe, getSnapshot)
  return {
    status: myStatus(),
    requests: [...state.requests],
    pendingCount: state.requests.filter((r) => r.status === 'pending').length,
    submit: submitVerification,
    review: reviewVerification,
  }
}
