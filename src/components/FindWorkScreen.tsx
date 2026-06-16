import { useState } from 'react'
import { ArrowLeft, ArrowRight, Plane, Check, Loader } from 'lucide-react'
import { useJobs, type PostedJob } from '../lib/jobsStore'
import { formatGBP } from '../data/marketplace'
import { toast } from '../lib/toast'
import { useAuth } from '../lib/auth'

function formatPickup(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Today ${time}`
  const t = new Date(now)
  t.setDate(now.getDate() + 1)
  if (d.toDateString() === t.toDateString()) return `Tomorrow ${time}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`
}

function CoverCard({
  job,
  onBuyNow,
  onBid,
}: {
  job: PostedJob
  onBuyNow: () => void
  onBid: (amount: number) => void
}) {
  const [bidding, setBidding] = useState(false)
  const [amount, setAmount] = useState(String(Math.max(1, Math.round(job.cap * 0.85))))

  return (
    <div className="rounded-2xl border border-[#27272A] bg-[#111113] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-[#FAFAFA] min-w-0">
          <Plane size={14} className="-rotate-45 text-[#71717A] shrink-0" />
          <span className="shrink-0">{job.fromCode}</span>
          <ArrowRight size={14} className="text-[#52525B] shrink-0" />
          <span className="truncate">{job.to}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold tabular-nums tracking-[-0.02em] text-[#FAFAFA]">
            {formatGBP(job.cap)}
          </div>
          <div className="text-[11px] text-[#71717A]">buy it now</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#71717A]">
        <span>{job.vehicle === 'large' ? 'Large · up to 8' : 'Standard · up to 4'}</span>
        <span>{job.passengers} pax</span>
        <span>{job.luggage} bags</span>
        <span>{formatPickup(job.pickupAt)}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-[#27272A]">
        {job.status === 'won' && (
          <span className="flex items-center gap-1.5 text-sm text-[#F97316] font-medium">
            <Check size={15} /> You won this journey · {formatGBP(job.myBid ?? job.cap)}
          </span>
        )}
        {job.status === 'lost' && (
          <span className="text-sm text-[#71717A]">Outbid — covered by another operator.</span>
        )}
        {job.status === 'bidding' && (
          <span className="flex items-center gap-1.5 text-sm text-[#A1A1AA]">
            <Loader size={14} className="animate-spin" /> Bid placed at {formatGBP(job.myBid ?? 0)} —
            awaiting result…
          </span>
        )}
        {job.status === 'open' &&
          (bidding ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-sm">£</span>
                <input
                  type="number"
                  min={1}
                  max={job.cap - 1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg pl-7 pr-3 py-2 text-sm text-[#FAFAFA] tabular-nums focus:outline-none focus:border-[#F97316]/60"
                />
              </div>
              <button
                onClick={() => {
                  const n = Number(amount)
                  if (n > 0 && n < job.cap) {
                    onBid(n)
                    toast('Bid placed')
                  }
                }}
                className="shrink-0 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Submit
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onBuyNow()
                  toast('Journey secured')
                }}
                className="flex-1 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors active:scale-[0.99]"
              >
                Buy it now · {formatGBP(job.cap)}
              </button>
              <button
                onClick={() => setBidding(true)}
                className="flex-1 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#FAFAFA] text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Place lower bid
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}

interface FindWorkScreenProps {
  onBack: () => void
}

export default function FindWorkScreen({ onBack }: FindWorkScreenProps) {
  const { market, buyNow, placeBid } = useJobs()
  const { user } = useAuth()
  const driverName = user?.name ?? 'You'

  return (
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-2xl mx-auto px-5 pt-20 pb-24">
        <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Driver</div>
        <h1 className="font-playfair italic text-4xl mt-1">Find Work</h1>
        <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
          Cover an operator's journey. Buy it now at their price, or bid lower to win the work and
          fill your empty miles. Bids are private.
        </p>

        <div className="mt-6 space-y-3">
          {market.map((j) => (
            <CoverCard
              key={j.id}
              job={j}
              onBuyNow={() => buyNow(j.id, driverName)}
              onBid={(amount) => placeBid(j.id, amount, driverName)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
