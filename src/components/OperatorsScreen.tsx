import { ArrowLeft, ArrowRight, Star, BadgeCheck } from 'lucide-react'
import OperatorTrust from './OperatorTrust'
import {
  OPERATORS,
  buildRecentClaims,
  formatGBP,
  type Operator,
  type Region,
} from '../data/marketplace'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < Math.round(rating) ? 'fill-current text-[#FAFAFA]' : 'text-[#3F3F46]'}
        />
      ))}
    </span>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[#27272A] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function OperatorCard({ op }: { op: Operator }) {
  return (
    <div className="rounded-2xl bg-[#111113] border border-[#27272A] p-5 hover:border-[#3F3F46] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-lg tracking-[-0.02em] text-[#FAFAFA] truncate">
              {op.name}
            </h3>
            <BadgeCheck size={16} className="text-[#A1A1AA] shrink-0" />
          </div>
          <div className="text-xs text-[#71717A]">
            {op.fleet} · Member since {op.memberSince}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <Stars rating={op.rating} />
          <span className="text-xs text-[#71717A] mt-1 tabular-nums">{op.rating.toFixed(1)} rating</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#18181B] border border-[#27272A] px-3 py-2">
        <div className="text-xl font-bold tabular-nums tracking-[-0.02em] text-[#FAFAFA]">
          {op.completed.toLocaleString('en-GB')}
        </div>
        <div className="text-[11px] text-[#71717A]">Journeys Completed</div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#A1A1AA]">Acceptance Rate</span>
            <span className="tabular-nums font-medium text-[#FAFAFA]">{op.acceptance}%</span>
          </div>
          <Bar pct={op.acceptance} color="#FAFAFA" />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#A1A1AA]">On-Time Performance</span>
            <span className="tabular-nums font-medium text-[#FAFAFA]">{op.onTime}%</span>
          </div>
          <Bar pct={op.onTime} color="#A1A1AA" />
        </div>
      </div>
    </div>
  )
}

interface OperatorsScreenProps {
  onBack: () => void
  regions: Region[]
}

export default function OperatorsScreen({ onBack, regions }: OperatorsScreenProps) {
  const operators = Object.values(OPERATORS)
  const avgRating = (operators.reduce((s, o) => s + o.rating, 0) / operators.length).toFixed(1)
  const totalCompleted = operators.reduce((s, o) => s + o.completed, 0)
  const recentClaims = buildRecentClaims(regions)

  return (
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-5xl mx-auto px-5 pt-20 pb-24 md:pb-16">
        <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
          <BadgeCheck size={14} />
          Operator Network
        </div>
        <h1 className="font-playfair italic text-4xl mt-1">Trusted Operators</h1>
        <p className="text-[#A1A1AA] text-sm mt-2 max-w-lg leading-relaxed">
          Every transfer on Wasted Miles is handled by a verified operator. Reputation is
          earned through completed journeys, acceptance rate and on-time performance.
        </p>

        <div className="flex flex-wrap gap-3 mt-5 text-sm">
          <div className="rounded-xl bg-[#18181B] border border-[#27272A] px-4 py-2">
            <span className="font-bold tabular-nums">{operators.length}</span>
            <span className="text-[#71717A]"> verified operators</span>
          </div>
          <div className="rounded-xl bg-[#18181B] border border-[#27272A] px-4 py-2 flex items-center gap-1.5">
            <Star size={14} className="text-[#FAFAFA] fill-current" />
            <span className="font-bold tabular-nums">{avgRating}</span>
            <span className="text-[#71717A]">avg rating</span>
          </div>
          <div className="rounded-xl bg-[#18181B] border border-[#27272A] px-4 py-2">
            <span className="font-bold tabular-nums">{totalCompleted.toLocaleString('en-GB')}</span>
            <span className="text-[#71717A]"> journeys completed</span>
          </div>
        </div>

        <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {operators.map((op) => (
            <OperatorCard key={op.id} op={op} />
          ))}
        </div>

        {/* Recently claimed journeys */}
        <h2 className="font-playfair italic text-2xl mt-12">Recently Claimed</h2>
        <p className="text-[#A1A1AA] text-sm mt-1">
          See who's winning work across the network right now.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {recentClaims.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-[#27272A] bg-[#111113] p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium text-[#FAFAFA]">
                  <span className="shrink-0">{c.fromCode}</span>
                  <ArrowRight size={13} className="text-[#52525B] shrink-0" />
                  <span className="truncate">{c.to}</span>
                </div>
                <div className="mt-1.5">
                  <OperatorTrust operator={OPERATORS[c.operatorId]} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[#FAFAFA] font-bold tabular-nums tracking-[-0.02em]">
                  {formatGBP(c.value)}
                </div>
                <div className="text-[11px] text-[#71717A] mt-0.5">{c.ago}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
