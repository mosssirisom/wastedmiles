import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'

const inputClass =
  'w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#F97316]/60'
const labelClass = 'block text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA] mb-1.5'

interface JoinScreenProps {
  onBack: () => void
}

export default function JoinScreen({ onBack }: JoinScreenProps) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', fleet: '1-5 vehicles' })

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  // Submit the signup to a configurable endpoint (VITE_SIGNUP_API_URL).
  // With no endpoint set it succeeds locally so the flow still works.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // Defaults to the Vercel serverless function at /api/signup.
    const url = import.meta.env.VITE_SIGNUP_API_URL || '/api/signup'
    setSubmitting(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const key = import.meta.env.VITE_SIGNUP_API_KEY
      if (key) headers.Authorization = `Bearer ${key}`
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, source: 'wasted-miles-web' }),
      })
      if (!res.ok) throw new Error(`Signup failed (${res.status})`)
      setSubmitted(true)
    } catch (err) {
      console.warn('[join] signup failed:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-md mx-auto px-5 pt-24 pb-16">
        {submitted ? (
          <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#F97316]/15 border border-[#F97316]/40 flex items-center justify-center">
              <Check size={26} className="text-[#F97316]" />
            </div>
            <h1 className="font-bold tracking-[-0.03em] text-3xl mt-4">You're on the network</h1>
            <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
              Thanks, {form.name || 'operator'}. We'll email {form.email || 'you'} to verify your
              account and get you claiming journeys.
            </p>
            <button
              onClick={onBack}
              className="mt-6 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Back to marketplace
            </button>
          </div>
        ) : (
          <>
            <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
              Join the Network
            </div>
            <h1 className="font-bold tracking-[-0.03em] text-4xl mt-1">Start recovering revenue</h1>
            <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
              Join verified operators trading airport transfers across the UK. Free for 14 days.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <label className={labelClass}>Operator / Company name</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                  placeholder="e.g. Pennine Cars"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Work email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                  placeholder="you@operator.co.uk"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fleet size</label>
                <select
                  value={form.fleet}
                  onChange={(e) => set('fleet', e.target.value)}
                  className={inputClass}
                >
                  <option>1-5 vehicles</option>
                  <option>6-20 vehicles</option>
                  <option>21-50 vehicles</option>
                  <option>50+ vehicles</option>
                </select>
              </div>

              {error && <p className="text-center text-xs text-[#F87171]">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 disabled:hover:bg-[#F97316] text-white text-sm font-medium py-3 rounded-lg transition-colors active:scale-[0.99]"
              >
                {submitting ? 'Creating account…' : 'Create operator account'}
              </button>
              <p className="text-center text-[11px] text-[#71717A]">
                No card required · Cancel anytime
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
