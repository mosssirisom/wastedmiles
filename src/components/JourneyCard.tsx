import { Plane, ArrowRight, Users, Briefcase, Armchair, Check } from 'lucide-react'
import OperatorTrust from './OperatorTrust'
import { OPERATORS, STATUS_META, formatGBP, type Journey } from '../data/marketplace'
import { toast } from '../lib/toast'
import { useClaims } from '../lib/claims'
import { postAction } from '../lib/actions'

function ctaLabel(status: Journey['status']): string {
  if (status === 'empty-return') return 'MATCH JOURNEY'
  if (status === 'cover-needed' || status === 'urgent') return 'OFFER COVER'
  return 'CLAIM JOURNEY'
}

function ctaToast(status: Journey['status']): string {
  if (status === 'empty-return') return 'Empty return matched'
  if (status === 'cover-needed' || status === 'urgent') return 'Cover offered'
  return 'Journey claimed'
}

interface JourneyCardProps {
  journey: Journey
  active: boolean
  onSelect: () => void
}

export default function JourneyCard({ journey, active, onSelect }: JourneyCardProps) {
  const operator = OPERATORS[journey.operatorId]
  const status = STATUS_META[journey.status]
  const { isClaimed, claimJourney } = useClaims()
  const claimed = isClaimed(journey.id)
  const timeUrgent = journey.responseMins != null
  const timeText = timeUrgent ? `${journey.responseMins} mins remaining` : journey.posted

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl p-4 border transition-colors ${
        active
          ? 'bg-[#F97316]/10 border-[#F97316]/50'
          : 'bg-[#111113] border-[#27272A] hover:border-[#3F3F46]'
      }`}
    >
      {/* Top: status (left) + price (right) */}
      <div className="flex items-start justify-between gap-3">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${status.badge}`}>
          {journey.status === 'urgent' ? 'URGENT' : status.label}
        </span>
        <div className="text-right">
          <div className="text-[#FAFAFA] text-2xl font-bold tabular-nums tracking-[-0.03em] leading-none">
            {formatGBP(journey.value)}
          </div>
          <div className={`mt-1 text-[11px] ${timeUrgent ? 'text-[#F59E0B]' : 'text-[#71717A]'}`}>
            {timeText}
          </div>
        </div>
      </div>

      {/* Main: route */}
      <div className="flex items-center gap-2 mt-3 text-[17px] font-semibold text-[#FAFAFA]">
        <Plane size={15} className="-rotate-45 text-[#71717A] shrink-0" />
        <span className="shrink-0">{journey.fromCode}</span>
        <ArrowRight size={15} className="text-[#52525B] shrink-0" />
        <span className="truncate">{journey.to}</span>
      </div>

      {/* Detail: vehicle, passengers, luggage, seats */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-xs text-[#71717A]">
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

      {/* Trust: operator, rating, completed, acceptance, on-time, member since */}
      <div className="mt-3 pt-3 border-t border-[#27272A]">
        <OperatorTrust operator={operator} />
      </div>

      {/* CTA */}
      <button
        disabled={claimed}
        onClick={(e) => {
          e.stopPropagation()
          if (claimed) return
          claimJourney(journey.id)
          toast(ctaToast(journey.status))
          postAction('claim', { journeyId: journey.id, status: journey.status })
        }}
        className={`mt-3 w-full text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
          claimed
            ? 'bg-[#18181B] border border-[#27272A] text-[#A1A1AA] cursor-default'
            : 'bg-[#F97316] hover:bg-[#EA580C] text-white active:scale-[0.99]'
        }`}
      >
        {claimed ? (
          <>
            <Check size={15} /> Claimed
          </>
        ) : (
          ctaLabel(journey.status)
        )}
      </button>
    </div>
  )
}
