export type ActionKind = 'claim' | 'message' | 'operator-action'

// Fire-and-forget action reporting. Defaults to the Vercel serverless
// function at /api/action; override with VITE_ACTIONS_API_URL.
export async function postAction(kind: ActionKind, payload: Record<string, unknown>) {
  const url = import.meta.env.VITE_ACTIONS_API_URL || '/api/action'
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const key = import.meta.env.VITE_ACTIONS_API_KEY
    if (key) headers.Authorization = `Bearer ${key}`
    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ kind, ...payload, source: 'wasted-miles-web' }),
    })
  } catch (err) {
    console.warn('[action] failed:', err)
  }
}
