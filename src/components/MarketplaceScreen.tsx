import { useMemo, useState } from 'react'
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react'
import JourneyCard from './JourneyCard'
import FilterDrawer, {
  DEFAULT_FILTERS,
  activeFilterCount,
  matchesFilters,
  type Filters,
} from './FilterDrawer'
import { OPERATORS, type Region, type Journey } from '../data/marketplace'

type Sort = 'value' | 'pickup' | 'urgent' | 'newest'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'value', label: 'Highest value' },
  { id: 'pickup', label: 'Nearest pickup' },
  { id: 'urgent', label: 'Most urgent' },
  { id: 'newest', label: 'Newest' },
]

const URGENCY_RANK: Record<Journey['status'], number> = {
  urgent: 0,
  'cover-needed': 1,
  'empty-return': 2,
  available: 3,
}

const pickupMinutes = (j: Journey) => {
  const m = j.pickup.match(/(\d+):(\d+)/)
  const base = j.pickup.toLowerCase().startsWith('tomorrow') ? 1440 : 0
  return base + (m ? Number(m[1]) * 60 + Number(m[2]) : 0)
}

const postedMinutes = (j: Journey) => {
  const m = j.posted.match(/(\d+)/)
  return m ? Number(m[1]) : 9999
}

const selectClass =
  'shrink-0 bg-[#18181B] border border-[#27272A] rounded-full px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#F97316]/60'

interface MarketplaceScreenProps {
  regions: Region[]
  onBack: () => void
  onOpenJourney: (journey: Journey) => void
  initialAirport?: string
}

export default function MarketplaceScreen({
  regions,
  onBack,
  onOpenJourney,
  initialAirport,
}: MarketplaceScreenProps) {
  const [search, setSearch] = useState('')
  const [airport, setAirport] = useState<string>(initialAirport ?? 'all')
  const [sort, setSort] = useState<Sort>('value')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const allJourneys = useMemo(() => regions.flatMap((r) => r.journeys), [regions])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = allJourneys.filter((j) => {
      if (airport !== 'all' && j.regionId !== airport) return false
      if (!matchesFilters(j, filters)) return false
      if (q) {
        const hay = `${j.to} ${j.fromCode} ${j.fromName} ${OPERATORS[j.operatorId].name}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    list.sort((a, b) => {
      switch (sort) {
        case 'value':
          return b.value - a.value
        case 'pickup':
          return pickupMinutes(a) - pickupMinutes(b)
        case 'urgent':
          return (
            URGENCY_RANK[a.status] - URGENCY_RANK[b.status] ||
            (a.responseMins ?? 999) - (b.responseMins ?? 999)
          )
        case 'newest':
          return postedMinutes(a) - postedMinutes(b)
      }
    })
    return list
  }, [allJourneys, airport, filters, search, sort])

  const filterCount = activeFilterCount(filters)

  return (
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      {/* Sticky header: title, search, controls */}
      <div className="sticky top-0 z-20 bg-[#09090B]/95 backdrop-blur-md border-b border-[#27272A] px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex items-center justify-center h-9 w-9 rounded-full bg-[#18181B] border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-playfair italic text-2xl">Marketplace</h1>
          <span className="ml-auto text-xs text-[#71717A] tabular-nums">{results.length} live</span>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search route, airport or operator"
            className="w-full bg-[#18181B] border border-[#27272A] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#F97316]/60"
          />
        </div>

        {/* Controls */}
        <div className="no-scrollbar mt-2 flex items-center gap-2 overflow-x-auto">
          <select value={airport} onChange={(e) => setAirport(e.target.value)} className={selectClass}>
            <option value="all">All airports</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} · {r.name}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectClass}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative shrink-0 flex items-center gap-1.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#FAFAFA] text-xs font-medium px-3 py-2 rounded-full transition-colors"
          >
            <SlidersHorizontal size={14} />
            Filters
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-[#F97316] text-white text-[10px] font-bold flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Opportunity list */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-24 md:pb-8">
        {results.length === 0 ? (
          <div className="text-center text-sm text-[#71717A] py-16">
            No journeys match your search.
          </div>
        ) : (
          results.map((j) => (
            <JourneyCard key={j.id} journey={j} active={false} onSelect={() => onOpenJourney(j)} />
          ))
        )}
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={setFilters}
        resultCount={results.length}
        totalCount={allJourneys.length}
        showDestination={false}
      />
    </div>
  )
}
