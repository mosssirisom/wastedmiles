import { ArrowLeft, Star, BadgeCheck } from 'lucide-react'
import { OPERATORS, type Operator } from '../data/marketplace'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} className={i < Math.round(rating) ? 'fill-current' : 'text-white/20'} />
      ))}
    </span>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function OperatorCard({ op }: { op: Operator }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-lg truncate">{op.name}</h3>
            <BadgeCheck size={16} className="text-[#e8702a] shrink-0" />
          </div>
          <div className="text-xs text-white/50">{op.fleet}</div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <Stars rating={op.rating} />
          <span className="text-xs text-white/50 mt-1 tabular-nums">{op.rating.toFixed(1)} rating</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
        <div className="text-xl font-semibold tabular-nums text-[#e8702a]">
          {op.completed.toLocaleString('en-GB')}
        </div>
        <div className="text-[11px] text-white/50">Journeys Completed</div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/60">Acceptance Rate</span>
            <span className="tabular-nums font-medium">{op.acceptance}%</span>
          </div>
          <Bar pct={op.acceptance} color="#22c55e" />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/60">On-Time Performance</span>
            <span className="tabular-nums font-medium">{op.onTime}%</span>
          </div>
          <Bar pct={op.onTime} color="#3b82f6" />
        </div>
      </div>
    </div>
  )
}

interface OperatorsScreenProps {
  onBack: () => void
}

export default function OperatorsScreen({ onBack }: OperatorsScreenProps) {
  const operators = Object.values(OPERATORS)
  const avgRating = (operators.reduce((s, o) => s + o.rating, 0) / operators.length).toFixed(1)
  const totalCompleted = operators.reduce((s, o) => s + o.completed, 0)

  return (
    <div className="relative w-full min-h-screen bg-black text-white" style={{ minHeight: '100dvh' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-white/90 backdrop-blur text-gray-900 text-sm font-semibold pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-white transition"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        <div className="flex items-center gap-2 text-[#e8702a] text-xs font-semibold uppercase tracking-wider">
          <BadgeCheck size={14} />
          Operator Network
        </div>
        <h1 className="font-playfair italic text-4xl mt-1">Trusted Operators</h1>
        <p className="text-white/60 text-sm mt-2 max-w-lg">
          Every transfer on Wasted Miles is handled by a verified operator. Reputation is
          earned through completed journeys, acceptance rate and on-time performance.
        </p>

        <div className="flex flex-wrap gap-3 mt-5 text-sm">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2">
            <span className="font-semibold tabular-nums">{operators.length}</span>
            <span className="text-white/50"> verified operators</span>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 flex items-center gap-1.5">
            <Star size={14} className="text-amber-400 fill-current" />
            <span className="font-semibold tabular-nums">{avgRating}</span>
            <span className="text-white/50">avg rating</span>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2">
            <span className="font-semibold tabular-nums">
              {totalCompleted.toLocaleString('en-GB')}
            </span>
            <span className="text-white/50"> journeys completed</span>
          </div>
        </div>

        <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {operators.map((op) => (
            <OperatorCard key={op.id} op={op} />
          ))}
        </div>
      </div>
    </div>
  )
}
