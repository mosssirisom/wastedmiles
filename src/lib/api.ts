// Central API client. All backend calls go through here.
// Base URL comes from VITE_API_URL; when unset the app runs fully on
// local mock/persisted data and these helpers are simply not used.
const BASE = import.meta.env.VITE_API_URL ?? ''

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function hasBackend() {
  return BASE.length > 0
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) throw new Error(`API ${res.status} ${path}`)
  if (res.status === 204) return null as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
