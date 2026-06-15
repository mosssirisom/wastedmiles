import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MapPin } from 'lucide-react'
import L from 'leaflet'
import { DARK_TILES, ATTRIBUTION, makeJobIcon } from '../lib/map'
import type { Town } from '../data/jobs'

interface AreaScreenProps {
  town: Town
  onBack: () => void
}

export default function AreaScreen({ town, onBack }: AreaScreenProps) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Interactive dark map with a marker per job.
  useEffect(() => {
    const el = mapDivRef.current
    if (!el) return
    const map = L.map(el, {
      center: town.center,
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    })
    mapRef.current = map
    L.tileLayer(DARK_TILES, { subdomains: 'abcd', attribution: ATTRIBUTION, maxZoom: 20 }).addTo(map)

    const markers: Record<string, L.Marker> = {}
    town.jobs.forEach((job) => {
      const marker = L.marker([job.lat, job.lng], { icon: makeJobIcon(false) }).addTo(map)
      marker.on('click', () => selectJob(job.id))
      markers[job.id] = marker
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
  }, [town])

  // Keep marker icons in sync with the selection.
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.setIcon(makeJobIcon(id === selectedId))
    })
  }, [selectedId])

  const selectJob = (id: string) => {
    setSelectedId(id)
    const job = town.jobs.find((j) => j.id === id)
    if (job && mapRef.current) {
      mapRef.current.flyTo([job.lat, job.lng], 14, { duration: 0.8 })
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

      {/* Job list panel */}
      <div className="absolute z-50 bg-[#0e0e0e]/90 backdrop-blur-xl border-white/10 text-white flex flex-col
        bottom-0 left-0 right-0 max-h-[55%] rounded-t-3xl border-t
        md:top-0 md:bottom-0 md:right-auto md:w-[380px] md:max-h-none md:rounded-none md:border-t-0 md:border-r">
        <div className="px-6 pt-6 pb-4 md:pt-20 shrink-0">
          <div className="flex items-center gap-2 text-[#e8702a] text-xs font-semibold uppercase tracking-wider">
            <MapPin size={14} />
            North West England
          </div>
          <h2 className="font-playfair italic text-3xl mt-1">{town.name}</h2>
          <p className="text-white/60 text-sm mt-1">
            {town.jobs.length} roles we cover in this area
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {town.jobs.map((job) => {
            const active = job.id === selectedId
            return (
              <button
                key={job.id}
                onClick={() => selectJob(job.id)}
                className={`w-full text-left rounded-2xl p-4 border transition ${
                  active
                    ? 'bg-[#e8702a]/15 border-[#e8702a]/60 ring-1 ring-[#e8702a]/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium text-[15px] leading-snug">{job.title}</h3>
                  <span className="shrink-0 text-[#e8702a] text-sm font-semibold">{job.pay}</span>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="bg-[#e8702a]/20 text-[#e8702a] text-[11px] font-medium px-2 py-0.5 rounded-full">
                    {job.type}
                  </span>
                  <span className="text-white/40 text-xs">{job.posted}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
