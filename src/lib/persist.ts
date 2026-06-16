// Tiny localStorage JSON helpers (guarded for SSR / privacy mode).
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
