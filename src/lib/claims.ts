import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'
import { api, hasBackend } from './api'

// Global store of claimed journey ids — persisted locally, and synced to
// the backend when one is configured (VITE_API_URL).
const STORAGE_KEY = 'wm-claims'
const claimed = new Set<string>(loadJSON<string[]>(STORAGE_KEY, []))
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  saveJSON(STORAGE_KEY, Array.from(claimed))
  listeners.forEach((l) => l())
}

export function claimJourney(id: string) {
  if (!claimed.has(id)) {
    claimed.add(id)
    emit()
    if (hasBackend()) {
      api.post('/claims', { journeyId: id }).catch(() => {})
    }
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
