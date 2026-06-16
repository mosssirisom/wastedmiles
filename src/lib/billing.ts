import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'

// Operator payment method on file. Demo stores only a brand + last4 locally;
// in production this is a Stripe SetupIntent / PaymentMethod id.
export interface Card {
  brand: string
  last4: string
}

const KEY = 'wm-card'
let card: Card | null = loadJSON<Card | null>(KEY, null)
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  saveJSON(KEY, card)
  listeners.forEach((l) => l())
}

export function setCard(next: Card) {
  card = next
  emit()
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

export function useBilling() {
  useSyncExternalStore(subscribe, getSnapshot)
  return { card, setCard }
}
