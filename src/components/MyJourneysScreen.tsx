import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import JourneyCard from './JourneyCard'
import { formatGBP, type Region, type Journey } from '../data/marketplace'
import { useClaims } from '../lib/claims'

interface MyJourneysScreenProps {
  regions: Region[]
  onBack: () => void
  onOpenJourney: (journey: Journey) => void
}

export default function MyJourneysScreen({ regions, onBack, onOpenJourney }: MyJourneysScreenProps) {
  const { claimedIds } = useClaims()
  const byId = new Map(regions.flatMap((r) => r.journeys).map((j) => [j.id, j]))
  const journeys = claimedIds.map((id) => byId.get(id)).filter((j): j is Journey => Boolean(j))
  const totalValue = journeys.reduce((s, j) => s + j.value, 0)

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
        <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
          <CheckCircle2 size={14} />
          Your work
        </div>
        <h1 className="font-playfair italic text-4xl mt-1">My Journeys</h1>

        <div className="flex flex-wrap gap-3 mt-4 text-sm">
          <div className="rounded-xl bg-[#18181B] border border-[#27272A] px-4 py-2">
            <span className="font-bold tabular-nums">{journeys.length}</span>
            <span className="text-[#71717A]"> claimed</span>
          </div>
          <div className="rounded-xl bg-[#18181B] border border-[#27272A] px-4 py-2">
            <span className="font-bold tabular-nums">{formatGBP(totalValue)}</span>
            <span className="text-[#71717A]"> total value</span>
          </div>
        </div>

        {journeys.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
              <CheckCircle2 size={22} className="text-[#52525B]" />
            </div>
            <p className="mt-3 text-sm text-[#71717A]">
              No claimed journeys yet. Claim work from the marketplace and it'll appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {journeys.map((j) => (
              <JourneyCard key={j.id} journey={j} active={false} onSelect={() => onOpenJourney(j)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
