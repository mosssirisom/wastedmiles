import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './persist'
import { isSupabaseConfigured, supabase } from './supabase'

type LocalUser = {
  email: string
  name?: string
}

const STORAGE_KEY = 'wm-auth-user'
let currentUser = loadJSON<LocalUser | null>(STORAGE_KEY, null)
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  saveJSON(STORAGE_KEY, currentUser)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return version
}

export function getAuthUser() {
  return currentUser
}

export function useAuth() {
  useSyncExternalStore(subscribe, getSnapshot)

  return {
    user: currentUser,
    async signIn(email: string, name?: string) {
      currentUser = { email, name }
      emit()
    },
    async signOut() {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut().catch(() => undefined)
      }
      currentUser = null
      emit()
    },
  }
}
