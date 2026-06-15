import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Repeat, LifeBuoy, Map, List } from 'lucide-react'
import L from 'leaflet'
import Fab from './Fab'
import JourneyCard from './JourneyCard'
import { DARK_TILES, DARK_ATTRIBUTION, makeJourneyIcon } from '../lib/map'
import { formatGBP, type Region, type Journey } from '../data/marketplace'

export type SectionKind = 'empty' | 'cover'

// UK-wide view — these sections aggregate across every airport region.
const MAP_CENTER: [number, number] = [54.2, -2.8]
const MAP_ZOOM = 6

const SECTION_CONFIG: Record<
  SectionKind,
  { title: string; description: string; tag: string; filter: (j: Journey) => boolean }
> = {
  empty: {
    title: 'Empty Mile Exchange',
    description: 'Turn empty return journeys into revenue.',
    tag: 'Empty Mile Exchange',
    filter: (j) => j.status === 'empty-return',
  },
  cover: {
    title: 'Emergency Cover',
    description: 'Find trusted operators when things go wrong.',
    tag: 'Emergency Cover',
    filter: (j) => j.status === 'cover-needed' || j.status === 'urgent',
  },
}

interface SectionScreenProps {
  section: SectionKind
  regions: Region[]
  onBack: () => void
}

export default function SectionScreen({ section, regions, onBack }: SectionScreenProps) {
  const config = SECTION_CONFIG[section]
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Mobile: jobs list is full-screen by default; toggle to peek the map.
  const [mapView, setMapView] = useState(false)

  const journeys = useMemo(
    () => regions.flatMap((r) => r.journeys).filter(config.filter),
    [regions, config]
  )

  const revenue = journeys.reduce((s, j) => s + j.value, 0)
  const seats = journeys.reduce((s, j) => s + (j.seats ?? 0), 0)
  const urgent = journeys.filter((j) => j.status === 'urgent').length

  // Interactive UK-wide dark map with a marker per journey.
  useEffect(() => {
    const el = mapDivRef.current
    if (!el) return
    const map = L.map(el, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: false,
      attributionControl: true,
    })
    mapRef.current = map
    L.tileLayer(DARK_TILES, { subdomains: 'abcd', attribution: DARK_ATTRIBUTION, maxZoom: 20 }).addTo(map)

    const markers: Record<string, L.Marker> = {}
    journeys.forEach((journey) => {
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
  }, [journeys])

  // Keep marker icons in sync with the selection.
  useEffect(() => {
    journeys.forEach((journey) => {
      const marker = markersRef.current[journey.id]
      if (marker) marker.setIcon(makeJourneyIcon(journey.status, journey.id === selectedId))
    })
  }, [selectedId, journeys])

  const selectJourney = (id: string) => {
    setSelectedId(id)
    const journey = journeys.find((j) => j.id === id)
    if (journey && mapRef.current) {
      mapRef.current.flyTo([journey.lat, journey.lng], 11, { duration: 0.8 })
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

      {/* Section panel */}
      <div
        className={`absolute z-50 bg-[#0e0e0e]/90 backdrop-blur-xl border-white/10 text-white flex flex-col ${
          mapView ? 'bottom-0 left-0 right-0 max-h-[55%] rounded-t-3xl border-t' : 'inset-0'
        } md:inset-auto md:top-0 md:bottom-0 md:left-0 md:right-auto md:w-[400px] md:max-h-none md:rounded-none md:border-t-0 md:border-r`}
      >
        {/* Header */}
        <div className={`px-6 pb-4 shrink-0 ${mapView ? 'pt-6' : 'pt-16'} md:pt-20`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-[#e8702a] text-xs font-semibold uppercase tracking-wider">
                {section === 'empty' ? <Repeat size={14} /> : <LifeBuoy size={14} />}
                {config.tag}
              </div>
              <h2 className="font-playfair italic text-3xl mt-1">{config.title}</h2>
              <p className="text-white/60 text-sm mt-1">{config.description}</p>
            </div>
            <button
              onClick={() => setMapView((v) => !v)}
              className="md:hidden flex items-center gap-1.5 shrink-0 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium px-3 py-2 rounded-full transition-colors"
            >
              {mapView ? <List size={14} /> : <Map size={14} />}
              {mapView ? 'List' : 'Map'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums">{journeys.length}</div>
              <div className="text-[11px] text-white/50">
                {section === 'empty' ? 'Empty Returns' : 'Cover Requests'}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-lg font-semibold tabular-nums text-[#e8702a]">
                {formatGBP(revenue)}
              </div>
              <div className="text-[11px] text-white/50">
                {section === 'empty' ? 'Potential Revenue' : 'At-Risk Revenue'}
              </div>
            </div>
            {section === 'empty' ? (
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <div className="text-lg font-semibold tabular-nums text-blue-400">{seats}</div>
                <div className="text-[11px] text-white/50">Seats Available</div>
              </div>
            ) : (
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <div className="text-lg font-semibold tabular-nums text-red-400">{urgent}</div>
                <div className="text-[11px] text-white/50">Urgent</div>
              </div>
            )}
          </div>
        </div>

        {/* Journey cards */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {journeys.map((journey) => (
            <JourneyCard
              key={journey.id}
              journey={journey}
              active={journey.id === selectedId}
              onSelect={() => selectJourney(journey.id)}
            />
          ))}
        </div>
      </div>

      {/* Expandable operator actions */}
      <Fab />
    </div>
  )
}
