import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'
import { api, hasBackend } from './api'

export interface Message {
  id: number
  from: 'me' | 'op'
  text: string
  at: number
}

export interface Thread {
  operatorId: string
  messages: Message[]
}

const STORAGE_KEY = 'wm-threads'
const stored = loadJSON<Record<string, Message[]>>(STORAGE_KEY, {})
const threads = new Map<string, Message[]>(Object.entries(stored))
const listeners = new Set<() => void>()
let version = 0
let mid = Object.values(stored)
  .flat()
  .reduce((max, m) => Math.max(max, m.id), 0)

function emit() {
  version++
  saveJSON(STORAGE_KEY, Object.fromEntries(threads))
  listeners.forEach((l) => l())
}

const REPLIES = [
  'Thanks — we can cover that. What time do you need pickup confirmed?',
  'Got it, checking our availability now.',
  'Happy to take this one. Sending a driver shortly.',
  'Appreciate the offer — can you share the flight number?',
]

export function ensureThread(operatorId: string) {
  if (!threads.has(operatorId)) {
    threads.set(operatorId, [])
    emit()
  }
}

export function sendMessage(operatorId: string, text: string) {
  const t = threads.get(operatorId) ?? []
  t.push({ id: ++mid, from: 'me', text, at: Date.now() })
  threads.set(operatorId, [...t])
  emit()

  if (hasBackend()) {
    api.post(`/threads/${operatorId}/messages`, { text }).catch(() => {})
  } else {
    // Local demo: simulate an operator reply.
    setTimeout(() => {
      const cur = threads.get(operatorId) ?? []
      cur.push({
        id: ++mid,
        from: 'op',
        text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        at: Date.now(),
      })
      threads.set(operatorId, [...cur])
      emit()
    }, 1200)
  }
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

export function useMessages() {
  useSyncExternalStore(subscribe, getSnapshot)
  return {
    getThread: (id: string): Message[] => threads.get(id) ?? [],
    getThreads: (): Thread[] =>
      Array.from(threads.entries())
        .map(([operatorId, messages]) => ({ operatorId, messages }))
        .sort((a, b) => {
          const lastA = a.messages[a.messages.length - 1]?.at ?? 0
          const lastB = b.messages[b.messages.length - 1]?.at ?? 0
          return lastB - lastA
        }),
    sendMessage,
    ensureThread,
  }
}
