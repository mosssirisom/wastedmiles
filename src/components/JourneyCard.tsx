import { Plane, ArrowRight, Users, Briefcase, Clock, Star, Armchair } from 'lucide-react'
import { OPERATORS, STATUS_META, formatGBP, type Journey } from '../data/marketplace'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < Math.round(rating) ? 'fill-current text-[#FAFAFA]' : 'text-[#3F3F46]'}
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
      className={`cursor-pointer rounded-2xl p-4 border transition-colors ${
        active
          ? 'bg-[#F97316]/10 border-[#F97316]/50'
          : 'bg-[#111113] border-[#27272A] hover:border-[#3F3F46]'
      }`}
    >
      {/* Status + value */}
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${status.badge}`}>
          {journey.status === 'urgent' ? 'URGENT' : status.label}
        </span>
        <span className="text-[#F97316] text-lg font-bold tabular-nums tracking-[-0.02em]">
          {formatGBP(journey.value)}
        </span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mt-2.5 text-[15px] font-medium text-[#FAFAFA]">
        <Plane size={14} className="-rotate-45 text-[#A1A1AA] shrink-0" />
        <span>{journey.fromCode}</span>
        <ArrowRight size={14} className="text-[#71717A] shrink-0" />
        <span className="truncate">{journey.to}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#A1A1AA]">
        <span>{journey.vehicle}</span>
        <span className="flex items-center gap-1">
          <Users size={12} /> {journey.passengers}
        </span>
        <span className="flex items-center gap-1">
          <Briefcase size={12} /> {journey.luggage}
        </span>
        {journey.seats != null && (
          <span className="flex items-center gap-1">
            <Armchair size={12} /> {journey.seats} seats
          </span>
        )}
      </div>

      {/* Pickup + posted / response time */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="flex items-center gap-1 text-[#A1A1AA]">
          <Clock size={12} /> {journey.pickup}
        </span>
        {journey.responseMins != null ? (
          <span className="text-[#F97316] font-medium">{journey.responseMins} mins remaining</span>
        ) : (
          <span className="text-[#71717A]">{journey.posted}</span>
        )}
      </div>

      {/* Operator trust footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#27272A]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-[#FAFAFA] truncate">{operator.name}</span>
            <Stars rating={operator.rating} />
          </div>
          <div className="text-[11px] text-[#71717A]">
            {operator.completed} journeys · {operator.acceptance}% accept · {operator.onTime}% on time
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={(e) => e.stopPropagation()}
        className="mt-3 w-full bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium py-2.5 rounded-lg transition-colors active:scale-[0.99]"
      >
        {ctaLabel(journey.status)}
      </button>
    </div>
  )
}
