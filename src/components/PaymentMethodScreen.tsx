import { useState } from 'react'
import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react'
import { useBilling } from '../lib/billing'
import { toast } from '../lib/toast'

const inputClass =
  'w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#F97316]/60'

interface PaymentMethodScreenProps {
  onBack: () => void
  onDone: () => void
}

export default function PaymentMethodScreen({ onBack, onDone }: PaymentMethodScreenProps) {
  const { card, setCard } = useBilling()
  const [number, setNumber] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const digits = number.replace(/\D/g, '')
    const last4 = digits.slice(-4) || '4242'
    setCard({ brand: 'Visa', last4 })
    toast('Payment method saved')
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

      <div className="max-w-md mx-auto px-5 pt-20 pb-24">
        <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Billing</div>
        <h1 className="font-playfair italic text-4xl mt-1">Payment method</h1>
        <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
          We authorise your card for a job's cap only when it's covered, and hold it securely until
          the transfer is completed.
        </p>

        {card && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#27272A] bg-[#111113] px-4 py-3">
            <CreditCard size={18} className="text-[#A1A1AA]" />
            <span className="text-sm text-[#FAFAFA]">
              {card.brand} ending •••• {card.last4}
            </span>
            <span className="ml-auto text-[11px] text-[#F97316] font-medium">On file</span>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="numeric"
            placeholder="Card number"
            className={inputClass}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input value={exp} onChange={(e) => setExp(e.target.value)} placeholder="MM / YY" className={inputClass} required />
            <input value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="CVC" className={inputClass} required />
          </div>
          <button
            type="submit"
            className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold py-3 rounded-lg transition-colors active:scale-[0.99]"
          >
            {card ? 'Update card' : 'Save card'}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#52525B]">
            <ShieldCheck size={13} />
            Demo only — replace with Stripe Elements (SetupIntent) in production.
          </p>
        </form>
      </div>
    </div>
  )
}
