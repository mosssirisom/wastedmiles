import type { VercelRequest, VercelResponse } from '@vercel/node'

interface SignupBody {
  name?: string
  email?: string
  fleet?: string
  source?: string
}

function safeParse(raw: string): SignupBody {
  try {
    return JSON.parse(raw) as SignupBody
  } catch {
    return {}
  }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body: SignupBody = typeof req.body === 'string' ? safeParse(req.body) : req.body ?? {}
  const name = (body.name ?? '').toString().trim()
  const email = (body.email ?? '').toString().trim()
  const fleet = (body.fleet ?? '').toString().trim()

  if (!name || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Name and a valid email are required.' })
  }

  const signup = {
    name,
    email,
    fleet,
    source: (body.source ?? 'wasted-miles-web').toString(),
    at: new Date().toISOString(),
  }

  // Visible in the Vercel function logs.
  console.log('[signup]', JSON.stringify(signup))

  // Optional: forward to a webhook (Slack / email / Zapier / etc.).
  const webhook = process.env.SIGNUP_WEBHOOK_URL
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New operator signup: ${name} <${email}> · ${fleet || 'fleet n/a'}`,
          signup,
        }),
      })
    } catch (err) {
      console.error('[signup] webhook failed', err)
    }
  }

  return res.status(200).json({ ok: true })
}
