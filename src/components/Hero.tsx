import { useCallback, useEffect, useRef, useState } from 'react'
import { Plane, Menu } from 'lucide-react'
import L from 'leaflet'
import { DARK_TILES, DARK_ATTRIBUTION } from '../lib/map'
import { marketplaceTotals, formatGBP, type Region } from '../data/marketplace'

// Display view: the UK — the marketplace covers airports nationwide.
const MAP_CENTER: [number, number] = [54.2, -2.8]
const MAP_ZOOM = 6

interface PinPos {
  id: string
  name: string
  count: number
  x: number
  y: number
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string | number
  label: string
  accent?: boolean
}) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5">
      <span
        className={`text-sm font-semibold tabular-nums ${
          accent ? 'text-[#e8702a]' : 'text-white'
        }`}
      >
        {value}
      </span>
      <span className="whitespace-nowrap text-[11px] text-white/50">{label}</span>
    </span>
  )
}

function StatDivider() {
  return <span className="h-4 w-px shrink-0 bg-white/15" />
}

interface HeroProps {
  regions: Region[]
  onSelectRegion: (id: string) => void
}

export default function Hero({ regions, onSelectRegion }: HeroProps) {
  const totals = marketplaceTotals(regions)

  const baseDivRef = useRef<HTMLDivElement>(null)
  const baseMapRef = useRef<L.Map | null>(null)
  const regionsRef = useRef(regions)
  regionsRef.current = regions
  const [pins, setPins] = useState<PinPos[]>([])

  // Project the airport regions onto the static map's pixel coordinates.
  const computePins = useCallback(() => {
    const map = baseMapRef.current
    if (!map) return
    setPins(
      regionsRef.current.map((r) => {
        const p = map.latLngToContainerPoint(r.center)
        return { id: r.id, name: r.name, count: r.journeys.length, x: p.x, y: p.y }
      })
    )
  }, [])

  // Single dark (Uber-style) map.
  useEffect(() => {
    const el = baseDivRef.current
    if (!el) return
    const map = L.map(el, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    })
    baseMapRef.current = map
    L.tileLayer(DARK_TILES, {
      subdomains: 'abcd',
      attribution: DARK_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map)

    const onResize = () => {
      map.invalidateSize()
      computePins()
    }
    setTimeout(() => {
      map.invalidateSize()
      computePins()
    }, 0)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      baseMapRef.current = null
    }
  }, [computePins])

  // Re-project pins whenever the region data changes (e.g. after fetch).
  useEffect(() => {
    computePins()
  }, [regions, computePins])

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 256 256" fill="#ffffff">
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="text-white text-2xl font-playfair italic">Wasted Miles</span>
        </div>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
          <button className="text-white px-4 py-1.5 rounded-full text-sm font-medium">
            Marketplace
          </button>
          {['Empty Miles', 'Cover', 'Operators', 'Pricing'].map((item) => (
            <button
              key={item}
              className="text-white/80 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/20 hover:text-white transition-colors"
            >
              {item}
            </button>
          ))}
        </div>

        <button className="hidden md:block bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100">
          Join the Network
        </button>

        <button className="md:hidden text-white" aria-label="Menu">
          <Menu size={26} />
        </button>
      </nav>

      {/* Sticky marketplace stats bar */}
      <div className="fixed top-16 left-0 right-0 z-[90] border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="no-scrollbar flex items-center gap-4 overflow-x-auto px-4 sm:px-5 py-2">
          <Stat value={totals.opportunities} label="Active Opportunities" />
          <StatDivider />
          <Stat value={formatGBP(totals.revenue)} label="Revenue Available" accent />
          <StatDivider />
          <Stat value={totals.emptyReturns} label="Empty Returns" />
          <StatDivider />
          <Stat value={totals.coverRequests} label="Cover Requests" />
          <StatDivider />
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live Updating
          </span>
        </div>
      </div>

      {/* Hero section */}
      <section
        className="relative w-full overflow-hidden h-screen bg-black"
        style={{ height: '100dvh' }}
      >
        {/* Dark Uber-style map */}
        <div ref={baseDivRef} className="absolute inset-0 z-10" />

        {/* Legibility gradient */}
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/60" />

        {/* Airport region markers */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          {pins.map((pin) => (
            <button
              key={pin.id}
              onClick={() => onSelectRegion(pin.id)}
              style={{ left: pin.x, top: pin.y }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            >
              <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-neutral-900/60 pl-2 pr-2.5 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-white/40 group-hover:bg-neutral-900/80">
                <Plane size={12} strokeWidth={2.5} className="-rotate-45 text-[#e8702a]" />
                <span className="whitespace-nowrap text-[11px] font-medium tracking-tight text-white/90">
                  {pin.name}
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-white/45">
                  {pin.count}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Heading */}
        <div className="absolute top-[14%] left-0 right-0 z-50 flex flex-col items-center text-center px-5 pointer-events-none">
          <h1 className="text-white leading-[0.95]">
            <span
              className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
              style={{ letterSpacing: '-0.05em', animationDelay: '0.25s' }}
            >
              Turn dead miles
            </span>
            <span
              className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
              style={{ letterSpacing: '-0.08em', animationDelay: '0.42s' }}
            >
              into revenue
            </span>
          </h1>
        </div>

        {/* Bottom-left paragraph */}
        <div
          className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 hero-anim hero-fade"
          style={{ animationDelay: '0.7s' }}
        >
          <p className="text-sm text-white/80 leading-relaxed">
            The professional operator network for UK airport transfers — trade
            journeys, fill empty returns, and request emergency cover in real time.
          </p>
        </div>

        {/* Bottom-right block */}
        <div
          className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] z-50 flex flex-col items-start gap-4 sm:gap-5 hero-anim hero-fade"
          style={{ animationDelay: '0.85s' }}
        >
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Tap any airport to enter its live marketplace and claim journeys across
            the network — before the miles go to waste.
          </p>
          <button
            onClick={() => onSelectRegion(regions[0]?.id ?? 'manchester')}
            className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30"
          >
            Enter Marketplace
          </button>
        </div>
      </section>
    </>
  )
}
