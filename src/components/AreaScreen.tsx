import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Plane, ArrowRight, Users, Briefcase, Clock, Star } from 'lucide-react'
import L from 'leaflet'
import Fab from './Fab'
import { DARK_TILES, DARK_ATTRIBUTION, makeJourneyIcon } from '../lib/map'
import {
  OPERATORS,
  STATUS_META,
  regionMetrics,
  formatGBP,
  type Region,
  type Journey,
} from '../data/marketplace'

interface AreaScreenProps {
  region: Region
  onBack: () => void
}

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

export default function AreaScreen({ region, onBack }: AreaScreenProps) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const metrics = regionMetrics(region)

  // Interactive dark map with a marker per journey.
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

    const markers: Record<string, L.Marker> = {}
    region.journeys.forEach((journey) => {
      const marker = L.marker([journey.lat, journey.lng], {
        icon: makeJourneyIcon(journey.status, false),
      }).addTo(map)
      marker.on('click', () => selectJourney(journey.id))
      markers[journey.id] = marker
    })
    markersRef.current = markers

    const onResize = () => map.invalidateSize()
    setTimeout(() => map.invalidateSize(), 0)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
      markersRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region])

  // Keep marker icons in sync with the selection.
  useEffect(() => {
    region.journeys.forEach((journey) => {
      const marker = markersRef.current[journey.id]
      if (marker) marker.setIcon(makeJourneyIcon(journey.status, journey.id === selectedId))
    })
  }, [selectedId, region])

  const selectJourney = (id: string) => {
    setSelectedId(id)
    const journey = region.journeys.find((j) => j.id === id)
    if (journey && mapRef.current) {
      mapRef.current.flyTo([journey.lat, journey.lng], 13, { duration: 0.8 })
    }
  }

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
          <div className="flex items-center gap-2 text-[#e8702a] text-xs font-semibold uppercase tracking-wider">
            <Plane size={14} className="-rotate-45" />
            {region.code} · Airport Region
          </div>
          <h2 className="font-playfair italic text-3xl mt-1">{region.name}</h2>

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
          {region.journeys.map((journey) => {
            const active = journey.id === selectedId
            const operator = OPERATORS[journey.operatorId]
            const status = STATUS_META[journey.status]
            return (
              <div
                key={journey.id}
                onClick={() => selectJourney(journey.id)}
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
                <div className="flex items-center gap-3 mt-2 text-xs text-white/55">
                  <span>{journey.vehicle}</span>
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {journey.passengers}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} /> {journey.luggage}
                  </span>
                </div>

                {/* Pickup + posted */}
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
                      {operator.completed} journeys · {operator.acceptance}% accept ·{' '}
                      {operator.onTime}% on time
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
          })}
        </div>
      </div>

      {/* Expandable operator actions */}
      <Fab />
    </div>
  )
}
