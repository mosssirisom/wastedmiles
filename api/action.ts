import type { VercelRequest, VercelResponse } from '@vercel/node'

function safeParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body ?? {})
  const kind = (body.kind ?? 'unknown').toString()

  const action = { ...body, kind, at: new Date().toISOString() }
  console.log('[action]', JSON.stringify(action))

  const webhook = process.env.ACTIONS_WEBHOOK_URL
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Marketplace action: ${kind}`, action }),
      })
    } catch (err) {
      console.error('[action] webhook failed', err)
    }
  }

  return res.status(200).json({ ok: true })
}
