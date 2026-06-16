import { Star } from 'lucide-react'
import { type Operator } from '../data/marketplace'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 shrink-0">
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

// Compact operator trust block: name, rating, completed, acceptance,
// on-time and member-since. Used on cards and the recently-claimed feed.
export default function OperatorTrust({ operator }: { operator: Operator }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-[#FAFAFA] truncate">{operator.name}</span>
        <Stars rating={operator.rating} />
        <span className="text-xs text-[#A1A1AA] tabular-nums">{operator.rating.toFixed(1)}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-[#71717A]">
        {operator.completed} journeys · {operator.acceptance}% acceptance · {operator.onTime}% on time
        · since {operator.memberSince}
      </div>
    </div>
  )
}
