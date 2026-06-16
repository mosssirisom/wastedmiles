import { X, SlidersHorizontal } from 'lucide-react'
import { VEHICLES, OPERATORS, type JourneyStatus, type Journey } from '../data/marketplace'

export interface Filters {
  destination: string
  minValue: number
  maxValue: number
  minPassengers: number
  vehicle: string
  status: 'all' | JourneyStatus
  urgentOnly: boolean
  minRating: number
  pickup: 'all' | 'today' | 'tomorrow'
  coverOnly: boolean
  emptyOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  destination: '',
  minValue: 0,
  maxValue: 500,
  minPassengers: 0,
  vehicle: 'all',
  status: 'all',
  urgentOnly: false,
  minRating: 0,
  pickup: 'all',
  coverOnly: false,
  emptyOnly: false,
}

export function activeFilterCount(f: Filters): number {
  let n = 0
  if (f.destination.trim()) n++
  if (f.minValue > 0) n++
  if (f.maxValue < 500) n++
  if (f.minPassengers > 0) n++
  if (f.vehicle !== 'all') n++
  if (f.status !== 'all') n++
  if (f.urgentOnly) n++
  if (f.minRating > 0) n++
  if (f.pickup !== 'all') n++
  if (f.coverOnly) n++
  if (f.emptyOnly) n++
  return n
}

// Shared journey matcher used by the marketplace and region screens.
export function matchesFilters(j: Journey, f: Filters): boolean {
  if (f.destination && !j.to.toLowerCase().includes(f.destination.toLowerCase())) return false
  if (j.value < f.minValue) return false
  if (f.maxValue < 500 && j.value > f.maxValue) return false
  if (j.passengers < f.minPassengers) return false
  if (f.vehicle !== 'all' && j.vehicle !== f.vehicle) return false
  if (f.status !== 'all' && j.status !== f.status) return false
  if (f.urgentOnly && j.status !== 'urgent') return false
  if (f.minRating && OPERATORS[j.operatorId].rating < f.minRating) return false
  if (f.pickup !== 'all') {
    const isTomorrow = j.pickup.toLowerCase().startsWith('tomorrow')
    if (f.pickup === 'today' && isTomorrow) return false
    if (f.pickup === 'tomorrow' && !isTomorrow) return false
  }
  if (f.coverOnly && !(j.status === 'cover-needed' || j.status === 'urgent')) return false
  if (f.emptyOnly && j.status !== 'empty-return') return false
  return true
}

const inputClass =
  'w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#F97316]/60'
const labelClass = 'block text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA] mb-1.5'

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: Filters
  onChange: (next: Filters) => void
  resultCount: number
  totalCount: number
  showDestination?: boolean
}

export default function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  resultCount,
  totalCount,
  showDestination = true,
}: FilterDrawerProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className={`fixed inset-0 z-[130] ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute right-0 top-0 bottom-0 w-[360px] max-w-[88vw] bg-[#111113] border-l border-[#27272A] text-[#FAFAFA] flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[#A1A1AA]" />
            <span className="font-semibold tracking-[-0.02em]">Filters</span>
          </div>
          <button onClick={onClose} aria-label="Close filters" className="text-[#A1A1AA] hover:text-[#FAFAFA]">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {showDestination && (
            <div>
              <label className={labelClass}>Destination</label>
              <input
                value={filters.destination}
                onChange={(e) => set('destination', e.target.value)}
                placeholder="e.g. Preston"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>
              Price range · £{filters.minValue} – £{filters.maxValue}
              {filters.maxValue >= 500 ? '+' : ''}
            </label>
            <input
              type="range"
              min={0}
              max={300}
              step={10}
              value={filters.minValue}
              onChange={(e) => set('minValue', Number(e.target.value))}
              className="w-full accent-[#F97316]"
            />
            <input
              type="range"
              min={100}
              max={500}
              step={10}
              value={filters.maxValue}
              onChange={(e) => set('maxValue', Number(e.target.value))}
              className="w-full accent-[#F97316]"
            />
          </div>

          <div>
            <label className={labelClass}>Journey type</label>
            <select
              value={filters.status}
              onChange={(e) => set('status', e.target.value as Filters['status'])}
              className={inputClass}
            >
              <option value="all">All journeys</option>
              <option value="available">Available</option>
              <option value="empty-return">Empty Return</option>
              <option value="cover-needed">Cover Needed</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Vehicle type</label>
            <select
              value={filters.vehicle}
              onChange={(e) => set('vehicle', e.target.value)}
              className={inputClass}
            >
              <option value="all">All vehicles</option>
              {VEHICLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Pickup time</label>
            <select
              value={filters.pickup}
              onChange={(e) => set('pickup', e.target.value as Filters['pickup'])}
              className={inputClass}
            >
              <option value="all">Any time</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Passengers</label>
            <select
              value={filters.minPassengers}
              onChange={(e) => set('minPassengers', Number(e.target.value))}
              className={inputClass}
            >
              <option value={0}>Any</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}+ passengers
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Operator rating</label>
            <select
              value={filters.minRating}
              onChange={(e) => set('minRating', Number(e.target.value))}
              className={inputClass}
            >
              <option value={0}>Any rating</option>
              <option value={4.5}>4.5+</option>
              <option value={4.8}>4.8+</option>
              <option value={5}>5.0 only</option>
            </select>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[#A1A1AA]">Urgent only</span>
              <input
                type="checkbox"
                checked={filters.urgentOnly}
                onChange={(e) => set('urgentOnly', e.target.checked)}
                className="h-4 w-4 accent-[#F97316]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[#A1A1AA]">Cover requests only</span>
              <input
                type="checkbox"
                checked={filters.coverOnly}
                onChange={(e) => set('coverOnly', e.target.checked)}
                className="h-4 w-4 accent-[#F97316]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[#A1A1AA]">Empty return journeys only</span>
              <input
                type="checkbox"
                checked={filters.emptyOnly}
                onChange={(e) => set('emptyOnly', e.target.checked)}
                className="h-4 w-4 accent-[#F97316]"
              />
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#27272A] shrink-0 flex items-center gap-3">
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="ml-auto bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Show {resultCount} of {totalCount}
          </button>
        </div>
      </div>
    </div>
  )
}
