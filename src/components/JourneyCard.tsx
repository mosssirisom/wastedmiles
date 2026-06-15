import { Plane, ArrowRight, Users, Briefcase, Clock, Star, Armchair } from 'lucide-react'
import { OPERATORS, STATUS_META, formatGBP, type Journey } from '../data/marketplace'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < Math.round(rating) ? 'fill-current' : 'text-white/20'}
        />
      ))}
    </span>
  )
}

function ctaLabel(status: Journey['status']): string {
  if (status === 'empty-return') return 'MATCH JOURNEY'
  if (status === 'cover-needed' || status === 'urgent') return 'OFFER COVER'
  return 'CLAIM JOURNEY'
}

interface JourneyCardProps {
  journey: Journey
  active: boolean
  onSelect: () => void
}

export default function JourneyCard({ journey, active, onSelect }: JourneyCardProps) {
  const operator = OPERATORS[journey.operatorId]
  const status = STATUS_META[journey.status]

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl p-4 border transition ${
        active
          ? 'bg-[#e8702a]/15 border-[#e8702a]/60 ring-1 ring-[#e8702a]/40'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
    >
      {/* Status + value */}
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.badge}`}>
          {journey.status === 'urgent' ? 'URGENT' : status.label}
        </span>
        <span className="text-[#e8702a] text-lg font-semibold tabular-nums">
          {formatGBP(journey.value)}
        </span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mt-2.5 text-[15px] font-medium">
        <Plane size={14} className="-rotate-45 text-white/60 shrink-0" />
        <span>{journey.fromCode}</span>
        <ArrowRight size={14} className="text-white/40 shrink-0" />
        <span className="truncate">{journey.to}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-white/55">
        <span>{journey.vehicle}</span>
        <span className="flex items-center gap-1">
          <Users size={12} /> {journey.passengers}
        </span>
        <span className="flex items-center gap-1">
          <Briefcase size={12} /> {journey.luggage}
        </span>
        {journey.seats != null && (
          <span className="flex items-center gap-1 text-blue-400">
            <Armchair size={12} /> {journey.seats} seats
          </span>
        )}
      </div>

      {/* Pickup + posted / response time */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="flex items-center gap-1 text-white/70">
          <Clock size={12} /> {journey.pickup}
        </span>
        {journey.responseMins != null ? (
          <span className="text-amber-400 font-medium">
            {journey.responseMins} mins remaining
          </span>
        ) : (
          <span className="text-white/40">{journey.posted}</span>
        )}
      </div>

      {/* Operator trust footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{operator.name}</span>
            <Stars rating={operator.rating} />
          </div>
          <div className="text-[11px] text-white/45">
            {operator.completed} journeys · {operator.acceptance}% accept · {operator.onTime}% on time
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={(e) => e.stopPropagation()}
        className="mt-3 w-full bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-semibold py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-[#e8702a]/30 active:scale-[0.99]"
      >
        {ctaLabel(journey.status)}
      </button>
    </div>
  )
}
