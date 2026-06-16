import { ArrowLeft, ArrowRight, BadgeCheck, Star, MessageSquare, MapPin, Car } from 'lucide-react'
import {
  buildReviews,
  buildOperatorJourneys,
  formatGBP,
  type Operator,
  type Region,
} from '../data/marketplace'
import { postAction } from '../lib/actions'

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? 'fill-current text-[#FAFAFA]' : 'text-[#3F3F46]'}
        />
      ))}
    </span>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-[#18181B] border border-[#27272A] px-3 py-2.5 text-center">
      <div className="text-lg font-bold tabular-nums tracking-[-0.02em] text-[#FAFAFA]">{value}</div>
      <div className="text-[11px] text-[#71717A]">{label}</div>
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#27272A] bg-[#18181B] px-3 py-1 text-xs text-[#A1A1AA]">
      {label}
    </span>
  )
}

interface OperatorProfileScreenProps {
  operator: Operator
  regions: Region[]
  onBack: () => void
  onMessage: (operatorId: string) => void
}

export default function OperatorProfileScreen({
  operator,
  regions,
  onBack,
  onMessage,
}: OperatorProfileScreenProps) {
  const reviews = buildReviews(operator.id)
  const recent = buildOperatorJourneys(regions, operator.id)

  return (
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-2xl mx-auto px-5 pt-20 pb-28">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-playfair italic text-3xl truncate">{operator.name}</h1>
              <BadgeCheck size={20} className="text-[#F97316] shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Stars rating={operator.rating} />
              <span className="text-sm text-[#A1A1AA] tabular-nums">{operator.rating.toFixed(1)}</span>
              <span className="text-[#3F3F46]">·</span>
              <span className="text-sm text-[#71717A]">Member since {operator.memberSince}</span>
            </div>
          </div>
        </div>

        {/* Trust metrics */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <Metric value={operator.completed.toLocaleString('en-GB')} label="Completed" />
          <Metric value={`${operator.acceptance}%`} label="Acceptance" />
          <Metric value={`${operator.onTime}%`} label="On time" />
        </div>

        {/* Service areas */}
        <div className="mt-6">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
            <MapPin size={13} /> Service areas
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {operator.serviceAreas.map((a) => (
              <Chip key={a} label={a} />
            ))}
          </div>
        </div>

        {/* Vehicle types */}
        <div className="mt-5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
            <Car size={13} /> Vehicle types
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {operator.vehicleTypes.map((v) => (
              <Chip key={v} label={v} />
            ))}
          </div>
        </div>

        {/* Recent completed journeys */}
        {recent.length > 0 && (
          <div className="mt-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
              Recent completed journeys
            </div>
            <div className="mt-2 space-y-2">
              {recent.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-[#27272A] bg-[#111113] p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#FAFAFA] min-w-0">
                    <span className="shrink-0">{c.fromCode}</span>
                    <ArrowRight size={13} className="text-[#52525B] shrink-0" />
                    <span className="truncate">{c.to}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold tabular-nums text-[#FAFAFA]">{formatGBP(c.value)}</div>
                    <div className="text-[11px] text-[#71717A]">{c.ago}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-6">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
            Reviews
          </div>
          <div className="mt-2 space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-[#27272A] bg-[#111113] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#FAFAFA] truncate">{r.author}</div>
                    <div className="text-[11px] text-[#71717A]">{r.role}</div>
                  </div>
                  <Stars rating={r.rating} size={12} />
                </div>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky contact bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-[70] border-t border-[#27272A] bg-[#09090B]/95 backdrop-blur-md px-5 py-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => {
              postAction('message', { operatorId: operator.id })
              onMessage(operator.id)
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold py-3 rounded-lg transition-colors active:scale-[0.99]"
          >
            <MessageSquare size={16} />
            Message {operator.name}
          </button>
        </div>
      </div>
    </div>
  )
}
