import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'
import { hasBackend, api } from './api'

// Driver verification (triple licensing lock). A driver cannot cover work
// until their PHD badge + council vehicle plate are verified.
export type VerifStatus = 'unverified' | 'pending' | 'verified'

export interface VerificationDetails {
  phdNumber: string
  phdExpiry: string
  plate: string
  plateExpiry: string
  authority: string // Phase 1: Blackpool only
  vehicleCategory: 'standard' | 'large'
  subcategory: '' | 'saloon' | 'estate' | 'executive' | 'minibus'
  passengerCapacity: number
  luggageCapacity: number
  badgeFile: string
  plateFile: string
}

interface State {
  status: VerifStatus
  details: VerificationDetails | null
}

const KEY = 'wm-verification'
let state: State = loadJSON<State>(KEY, { status: 'unverified', details: null })
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  saveJSON(KEY, state)
  listeners.forEach((l) => l())
}

export function submitVerification(details: VerificationDetails) {
  state = { status: 'pending', details }
  emit()
  if (hasBackend()) {
    api.post('/verification', details).catch(() => {})
  } else {
    // Demo: simulate the council/licensing check approving.
    setTimeout(() => {
      state = { status: 'verified', details }
      emit()
    }, 4000)
  }
}

// Resume a pending check left over from a reload (demo).
if (state.status === 'pending' && !hasBackend()) {
  setTimeout(() => {
    if (state.status === 'pending') {
      state = { status: 'verified', details: state.details }
      emit()
    }
  }, 2000)
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
  return { status: state.status, details: state.details, submit: submitVerification }
}
