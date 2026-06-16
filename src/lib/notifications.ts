import { useSyncExternalStore } from 'react'

export type NotifKind = 'urgent' | 'message' | 'claim' | 'system'

export interface Notification {
  id: number
  kind: NotifKind
  title: string
  body: string
  at: number
  read: boolean
}

let nid = 0
const items: Notification[] = []
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  listeners.forEach((l) => l())
}

function add(kind: NotifKind, title: string, body: string, read = false) {
  items.unshift({ id: ++nid, kind, title, body, at: Date.now(), read })
  emit()
}

// Seed a few so the inbox isn't empty on first open.
add('urgent', 'Urgent cover needed', 'Manchester Airport → Bolton · respond in 12 mins')
add('message', 'New message', 'Pennine Cars replied to your enquiry')
add('system', 'Network update', '142 live opportunities and £18k available near you.')

let started = false
const FEED: [NotifKind, string, string][] = [
  ['urgent', 'Urgent cover needed', 'Heathrow → Reading · respond in 9 mins'],
  ['claim', 'Journey claimed', 'A journey you posted was just claimed.'],
  ['urgent', 'Urgent cover needed', 'Gatwick → Brighton · respond in 15 mins'],
  ['message', 'New message', 'Skyline Chauffeurs sent you a message.'],
]

// Simulate live notifications arriving over time.
export function startNotificationFeed() {
  if (started) return
  started = true
  let i = 0
  setInterval(() => {
    const [k, t, b] = FEED[i % FEED.length]
    add(k, t, b)
    i++
  }, 30000)
}

export function markAllRead() {
  let changed = false
  items.forEach((i) => {
    if (!i.read) {
      i.read = true
      changed = true
    }
  })
  if (changed) emit()
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

export function useNotifications() {
  useSyncExternalStore(subscribe, getSnapshot)
  return {
    list: [...items],
    unread: items.filter((i) => !i.read).length,
    markAllRead,
  }
}
