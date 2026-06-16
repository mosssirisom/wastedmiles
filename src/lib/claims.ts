import { useSyncExternalStore } from 'react'

// Lightweight global store of claimed journey ids (no prop drilling).
const claimed = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

export function claimJourney(id: string) {
  if (!claimed.has(id)) {
    claimed.add(id)
    version++
    listeners.forEach((l) => l())
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

// Subscribe a component to claim changes; returns the store helpers.
export function useClaims() {
  useSyncExternalStore(subscribe, getSnapshot)
  return { isClaimed, claimJourney }
}
