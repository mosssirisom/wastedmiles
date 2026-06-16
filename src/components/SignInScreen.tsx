import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../lib/auth'

interface SignInScreenProps {
  onBack: () => void
  onDone: () => void
}

export default function SignInScreen({ onBack, onDone }: SignInScreenProps) {
  const { signIn, loading } = useAuth()
  const [email, setEmail] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    await signIn(email.trim())
    onDone()
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
        <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
          Operator access
        </div>
        <h1 className="font-playfair italic text-4xl mt-1">Sign in</h1>
        <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
          Access your claimed journeys, messages and dispatch tools.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              Work email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@operator.co.uk"
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#F97316]/60"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white text-sm font-medium py-3 rounded-lg transition-colors active:scale-[0.99]"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </button>
          <p className="text-center text-[11px] text-[#52525B]">
            We'll send a secure link — no password needed.
          </p>
        </form>
      </div>
    </div>
  )
}
