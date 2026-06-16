import { X, ArrowRight, BadgeCheck, Star, MessageSquare } from 'lucide-react'
import { OPERATORS, STATUS_META, formatGBP, type Journey } from '../data/marketplace'

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] p-3">
      <div className="text-[11px] text-[#71717A]">{label}</div>
      <div className="text-sm font-medium text-[#FAFAFA] mt-0.5 truncate">{value}</div>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-[#111113] border border-[#27272A] py-2">
      <div className="text-sm font-bold text-[#FAFAFA] tabular-nums">{value}</div>
      <div className="text-[10px] text-[#71717A]">{label}</div>
    </div>
  )
}

interface JourneyDetailProps {
  journey: Journey | null
  onClose: () => void
  onOpenOperator?: (operatorId: string) => void
}

export default function JourneyDetail({ journey, onClose, onOpenOperator }: JourneyDetailProps) {
  if (!journey) return null
  const op = OPERATORS[journey.operatorId]
  const status = STATUS_META[journey.status]
  const timeUrgent = journey.responseMins != null
  const timeText = timeUrgent ? `${journey.responseMins} mins remaining` : `Posted ${journey.posted}`
  const statusText = journey.status === 'urgent' ? 'Urgent' : status.label

  return (
    <div className="fixed inset-0 z-[130] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative animate-sheet mx-auto w-full max-w-md max-h-[92%] overflow-y-auto rounded-t-2xl border-t border-[#27272A] bg-[#111113] px-5 pt-2"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#27272A]" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-4 text-[#71717A] hover:text-[#FAFAFA]"
        >
          <X size={20} />
        </button>

        {/* Header: status + time, route, value */}
        <div className="flex items-center justify-between gap-3 pr-6">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${status.badge}`}>
            {statusText.toUpperCase()}
          </span>
          <span className={`text-[11px] ${timeUrgent ? 'text-[#F59E0B]' : 'text-[#71717A]'}`}>
            {timeText}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-[#FAFAFA]">
          <span className="shrink-0">{journey.fromCode}</span>
          <ArrowRight size={16} className="text-[#52525B] shrink-0" />
          <span className="truncate">{journey.to}</span>
        </div>

        <div className="mt-2 text-3xl font-bold tabular-nums tracking-[-0.03em] text-[#FAFAFA]">
          {formatGBP(journey.value)}
        </div>
        <div className="text-[11px] text-[#71717A]">Journey value</div>

        {/* Journey details */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Field label="Pickup airport" value={journey.fromName} />
          <Field label="Pickup time" value={journey.pickup} />
          <Field label="Destination" value={journey.to} />
          <Field label="Vehicle required" value={journey.vehicle} />
          <Field label="Passengers" value={String(journey.passengers)} />
          <Field label="Luggage" value={String(journey.luggage)} />
          {journey.seats != null && <Field label="Seats available" value={String(journey.seats)} />}
          <Field label="Status" value={statusText} />
        </div>

        {/* Operator profile */}
        <div className="mt-5">
          <div className="text-[11px] text-[#71717A] uppercase tracking-wider mb-2">Operator</div>
          <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onOpenOperator?.(op.id)}
                className="flex items-center gap-1.5 min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <span className="text-base font-semibold text-[#FAFAFA] truncate">{op.name}</span>
                <BadgeCheck size={16} className="text-[#A1A1AA] shrink-0" />
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <Stars rating={op.rating} />
                <span className="text-xs text-[#A1A1AA] ml-0.5 tabular-nums">{op.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="mt-0.5 text-[11px] text-[#71717A]">Member since {op.memberSince}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Metric value={op.completed.toLocaleString('en-GB')} label="Completed" />
              <Metric value={`${op.acceptance}%`} label="Acceptance" />
              <Metric value={`${op.onTime}%`} label="On time" />
            </div>
          </div>
        </div>

        {/* CTAs */}
        <button
          className="mt-5 w-full bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold py-3 rounded-lg transition-colors active:scale-[0.99]"
        >
          Claim Journey
        </button>
        <button
          className="mt-2 w-full flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#FAFAFA] text-sm font-medium py-3 rounded-lg transition-colors"
        >
          <MessageSquare size={16} />
          Message Operator
        </button>
      </div>
    </div>
  )
}
