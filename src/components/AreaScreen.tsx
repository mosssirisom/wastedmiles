import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Plane, SlidersHorizontal } from 'lucide-react'
import L from 'leaflet'
import Fab from './Fab'
import JourneyCard from './JourneyCard'
import FilterDrawer, { DEFAULT_FILTERS, activeFilterCount, type Filters } from './FilterDrawer'
import { DARK_TILES, DARK_ATTRIBUTION, makeJourneyIcon } from '../lib/map'
import { OPERATORS, regionMetrics, formatGBP, type Region } from '../data/marketplace'

interface AreaScreenProps {
  region: Region
  onBack: () => void
}

export default function AreaScreen({ region, onBack }: AreaScreenProps) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const metrics = regionMetrics(region)

  const filtered = useMemo(() => {
    return region.journeys.filter((j) => {
      if (filters.destination && !j.to.toLowerCase().includes(filters.destination.toLowerCase()))
        return false
      if (j.value < filters.minValue) return false
      if (j.passengers < filters.minPassengers) return false
      if (filters.vehicle !== 'all' && j.vehicle !== filters.vehicle) return false
      if (filters.status !== 'all' && j.status !== filters.status) return false
      if (filters.minRating && OPERATORS[j.operatorId].rating < filters.minRating) return false
      if (filters.coverOnly && !(j.status === 'cover-needed' || j.status === 'urgent')) return false
      if (filters.emptyOnly && j.status !== 'empty-return') return false
      return true
    })
  }, [region, filters])

  const selectJourney = (id: string) => {
    setSelectedId(id)
    const journey = region.journeys.find((j) => j.id === id)
    if (journey && mapRef.current) {
      mapRef.current.flyTo([journey.lat, journey.lng], 13, { duration: 0.8 })
    }
  }

  // Create the map + a marker layer group, once per region.
  useEffect(() => {
    const el = mapDivRef.current
    if (!el) return
    const map = L.map(el, {
      center: region.center,
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
    })
    mapRef.current = map
    L.tileLayer(DARK_TILES, { subdomains: 'abcd', attribution: DARK_ATTRIBUTION, maxZoom: 20 }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)

    const onResize = () => map.invalidateSize()
    setTimeout(() => map.invalidateSize(), 0)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
      layerRef.current = null
      markersRef.current = {}
    }
  }, [region])

  // Rebuild markers whenever the filtered set changes.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()
    const markers: Record<string, L.Marker> = {}
    filtered.forEach((journey) => {
      const marker = L.marker([journey.lat, journey.lng], {
        icon: makeJourneyIcon(journey.status, journey.id === selectedId),
      })
      marker.on('click', () => selectJourney(journey.id))
      marker.addTo(layer)
      markers[journey.id] = marker
    })
    markersRef.current = markers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  // Keep marker icons in sync with the selection.
  useEffect(() => {
    filtered.forEach((journey) => {
      const marker = markersRef.current[journey.id]
      if (marker) marker.setIcon(makeJourneyIcon(journey.status, journey.id === selectedId))
    })
  }, [selectedId, filtered])

  const filterCount = activeFilterCount(filters)

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden" style={{ height: '100dvh' }}>
      {/* Dark interactive map */}
      <div ref={mapDivRef} className="absolute inset-0 z-10" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-[60] flex items-center gap-2 bg-white/90 backdrop-blur text-gray-900 text-sm font-semibold pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-white transition"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Marketplace panel */}
      <div className="absolute z-50 bg-[#0e0e0e]/90 backdrop-blur-xl border-white/10 text-white flex flex-col
        bottom-0 left-0 right-0 max-h-[60%] rounded-t-3xl border-t
        md:top-0 md:bottom-0 md:right-auto md:w-[400px] md:max-h-none md:rounded-none md:border-t-0 md:border-r">
        {/* Regional header */}
        <div className="px-6 pt-6 pb-4 md:pt-20 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-[#e8702a] text-xs font-semibold uppercase tracking-wider">
                <Plane size={14} className="-rotate-45" />
                {region.code} · Airport Region
              </div>
              <h2 className="font-playfair italic text-3xl mt-1">{region.name}</h2>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative flex items-center gap-1.5 shrink-0 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium px-3 py-2 rounded-full transition-colors"
            >
              <SlidersHorizontal size={14} />
              Filters
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-[#e8702a] text-[10px] font-bold flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums">{metrics.opportunities}</div>
              <div className="text-[11px] text-white/50">Active Opportunities</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums text-[#e8702a]">
                {formatGBP(metrics.revenue)}
              </div>
              <div className="text-[11px] text-white/50">Available Revenue</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums text-blue-400">
                {metrics.emptyReturns}
              </div>
              <div className="text-[11px] text-white/50">Empty Returns</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums text-amber-400">
                {metrics.coverRequests}
              </div>
              <div className="text-[11px] text-white/50">Cover Requests</div>
            </div>
          </div>
        </div>

        {/* Journey cards */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-white/40 py-10">
              No journeys match your filters.
            </div>
          ) : (
            filtered.map((journey) => (
              <JourneyCard
                key={journey.id}
                journey={journey}
                active={journey.id === selectedId}
                onSelect={() => selectJourney(journey.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Expandable operator actions */}
      <Fab />

      {/* Filters */}
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        totalCount={region.journeys.length}
      />
    </div>
  )
}
