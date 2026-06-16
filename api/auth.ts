import type { VercelRequest, VercelResponse } from '@vercel/node'

function safeParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

// DEMO auth: issues a non-secure token derived from the email.
// Replace with a real identity provider (JWT/session, password or OTP)
// and a users table before going to production.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body ?? {})
  const email = (body.email ?? '').toString().trim()
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'A valid email is required.' })
  }

  const handle = email.split('@')[0]
  const id = `u_${slug(handle)}`
  const user = {
    id,
    name: (body.name ?? handle).toString(),
    email,
    operatorId: id,
  }
  const token = Buffer.from(`${id}:${Date.now()}`).toString('base64')

  console.log('[auth] sign-in', JSON.stringify({ id, email }))
  return res.status(200).json({ ok: true, token, user })
}
