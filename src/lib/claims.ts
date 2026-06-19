import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'
import { api, hasBackend } from './api'
import { isSupabaseConfigured } from './supabase'
import { claimJourney as claimJourneyRemote } from './marketplaceService'

// Global store of claimed journey ids — persisted locally, and synced to
// Supabase when configured. Legacy VITE_API_URL support remains as fallback.
const STORAGE_KEY = 'wm-claims'
const claimed = new Set<string>(loadJSON<string[]>(STORAGE_KEY, []))
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  saveJSON(STORAGE_KEY, Array.from(claimed))
  listeners.forEach((l) => l())
}

export function getCurrentOperatorId() {
  return import.meta.env.VITE_OPERATOR_ID || localStorage.getItem('wm-current-operator-id') || ''
}

export function setCurrentOperatorId(operatorId: string) {
  localStorage.setItem('wm-current-operator-id', operatorId)
}

async function syncClaim(id: string) {
  const operatorId = getCurrentOperatorId()

  if (isSupabaseConfigured && operatorId) {
    await claimJourneyRemote(id, operatorId)
    return
  }

  if (hasBackend()) {
    await api.post('/claims', { journeyId: id, operatorId: operatorId || undefined })
  }
}

export function claimJourney(id: string) {
  if (!claimed.has(id)) {
    claimed.add(id)
    emit()
    syncClaim(id).catch((error) => {
      console.warn('[claims] claim saved locally but remote sync failed:', error)
    })
  }
}

export function isClaimed(id: string) {
  return claimed.has(id)
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

export function useClaims() {
  useSyncExternalStore(subscribe, getSnapshot)
  return { isClaimed, claimJourney, claimedIds: Array.from(claimed) }
}
