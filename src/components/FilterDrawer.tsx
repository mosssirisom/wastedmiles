import { X, SlidersHorizontal } from 'lucide-react'
import { VEHICLES, type JourneyStatus } from '../data/marketplace'

export interface Filters {
  destination: string
  minValue: number
  minPassengers: number
  vehicle: string
  status: 'all' | JourneyStatus
  minRating: number
  coverOnly: boolean
  emptyOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  destination: '',
  minValue: 0,
  minPassengers: 0,
  vehicle: 'all',
  status: 'all',
  minRating: 0,
  coverOnly: false,
  emptyOnly: false,
}

export function activeFilterCount(f: Filters): number {
  let n = 0
  if (f.destination.trim()) n++
  if (f.minValue > 0) n++
  if (f.minPassengers > 0) n++
  if (f.vehicle !== 'all') n++
  if (f.status !== 'all') n++
  if (f.minRating > 0) n++
  if (f.coverOnly) n++
  if (f.emptyOnly) n++
  return n
}

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#e8702a]/60'
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-1.5'

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: Filters
  onChange: (next: Filters) => void
  resultCount: number
  totalCount: number
}

export default function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  resultCount,
  totalCount,
}: FilterDrawerProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className={`fixed inset-0 z-[110] ${open ? '' : 'pointer-events-none'}`}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-[360px] max-w-[88vw] bg-[#0e0e0e]/95 backdrop-blur-xl border-l border-white/10 text-white flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[#e8702a]" />
            <span className="font-semibold">Filters</span>
          </div>
          <button onClick={onClose} aria-label="Close filters" className="text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <label className={labelClass}>Destination</label>
            <input
              value={filters.destination}
              onChange={(e) => set('destination', e.target.value)}
              placeholder="e.g. Preston"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Minimum Journey Value · £{filters.minValue}
            </label>
            <input
              type="range"
              min={0}
              max={300}
              step={10}
              value={filters.minValue}
              onChange={(e) => set('minValue', Number(e.target.value))}
              className="w-full accent-[#e8702a]"
            />
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
            <label className={labelClass}>Vehicle Type</label>
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
            <label className={labelClass}>Journey Type</label>
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
            <label className={labelClass}>Operator Rating</label>
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
              <span className="text-sm text-white/80">Cover Requests Only</span>
              <input
                type="checkbox"
                checked={filters.coverOnly}
                onChange={(e) => set('coverOnly', e.target.checked)}
                className="h-4 w-4 accent-[#e8702a]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-white/80">Empty Return Journeys Only</span>
              <input
                type="checkbox"
                checked={filters.emptyOnly}
                onChange={(e) => set('emptyOnly', e.target.checked)}
                className="h-4 w-4 accent-[#e8702a]"
              />
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10 shrink-0 flex items-center gap-3">
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-sm text-white/60 hover:text-white"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="ml-auto bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
          >
            Show {resultCount} of {totalCount}
          </button>
        </div>
      </div>
    </div>
  )
}
