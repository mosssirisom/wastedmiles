import { useCallback, useEffect, useRef, useState } from 'react'
import { Plane, Menu, ArrowRight, Star } from 'lucide-react'
import L from 'leaflet'
import { DARK_TILES, DARK_ATTRIBUTION } from '../lib/map'
import {
  marketplaceTotals,
  regionMetrics,
  buildActivity,
  formatGBP,
  OPERATORS,
  type Region,
} from '../data/marketplace'
import type { SectionKind } from './SectionScreen'

// Display view: the UK — the marketplace covers airports nationwide.
const MAP_CENTER: [number, number] = [54.2, -2.8]
const MAP_ZOOM = 6

interface PinPos {
  id: string
  code: string
  count: number
  revenue: number
  x: number
  y: number
}

function Stat({
  value,
  label,
  accent,
  onClick,
}: {
  value: string | number
  label: string
  accent?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span
        className={`text-sm font-semibold tabular-nums ${
          accent ? 'text-[#e8702a]' : 'text-white'
        }`}
      >
        {value}
      </span>
      <span className="whitespace-nowrap text-[11px] text-white/50">{label}</span>
    </>
  )
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex shrink-0 items-baseline gap-1.5 rounded-md px-1 -mx-1 transition-colors hover:bg-white/10"
      >
        {content}
      </button>
    )
  }
  return <span className="flex shrink-0 items-baseline gap-1.5">{content}</span>
}

function StatDivider() {
  return <span className="h-4 w-px shrink-0 bg-white/15" />
}

// Live marketplace activity feed — recent dispatch events that tick in.
interface FeedItem {
  id: number
  text: string
  age: number
}

function LiveActivity({ events }: { events: string[] }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const idx = useRef(0)
  const uid = useRef(0)

  useEffect(() => {
    if (!events.length) return
    const seed: FeedItem[] = []
    for (let i = 0; i < 4; i++) {
      seed.push({ id: uid.current++, text: events[i % events.length], age: (i + 1) * 11 })
    }
    setItems(seed)
    idx.current = 4
    const t = setInterval(() => {
      setItems((prev) => {
        const aged = prev.map((it) => ({ ...it, age: it.age + 3 }))
        const next = { id: uid.current++, text: events[idx.current % events.length], age: 0 }
        idx.current++
        return [next, ...aged].slice(0, 4)
      })
    }, 3000)
    return () => clearInterval(t)
  }, [events])

  const fmt = (a: number) => (a < 60 ? `${a}s ago` : `${Math.floor(a / 60)}m ago`)

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0e0e]/70 backdrop-blur-xl p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Live Activity
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-start gap-2 text-xs leading-snug">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8702a]" />
            <span className="text-white/80">{it.text}</span>
            <span className="ml-auto shrink-0 text-[10px] text-white/35">{fmt(it.age)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface HeroProps {
  regions: Region[]
  onSelectRegion: (id: string) => void
  onOpenSection: (section: SectionKind) => void
}

export default function Hero({ regions, onSelectRegion, onOpenSection }: HeroProps) {
  const totals = marketplaceTotals(regions)
  const activity = buildActivity(regions)

  // Top available journeys, surfaced on the homepage above the fold.
  const available = regions
    .flatMap((r) => r.journeys)
    .filter((j) => j.status === 'available')
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)

  // Network operator trust indicators.
  const ops = Object.values(OPERATORS)
  const avgRating = (ops.reduce((s, o) => s + o.rating, 0) / ops.length).toFixed(1)
  const avgOnTime = (ops.reduce((s, o) => s + o.onTime, 0) / ops.length).toFixed(1)

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
        return {
          id: r.id,
          code: r.code,
          count: r.journeys.length,
          revenue: regionMetrics(r).revenue,
          x: p.x,
          y: p.y,
        }
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
          <button className="bg-[#e8702a] text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow shadow-[#e8702a]/30">
            Marketplace
          </button>
          <button
            onClick={() => onOpenSection('empty')}
            className="text-white/80 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/20 hover:text-white transition-colors"
          >
            Empty Miles
          </button>
          <button
            onClick={() => onOpenSection('cover')}
            className="text-white/80 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/20 hover:text-white transition-colors"
          >
            Cover
          </button>
          {['Operators', 'Pricing'].map((item) => (
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
          <Stat
            value={totals.emptyReturns}
            label="Empty Returns"
            onClick={() => onOpenSection('empty')}
          />
          <StatDivider />
          <Stat
            value={totals.coverRequests}
            label="Cover Requests"
            onClick={() => onOpenSection('cover')}
          />
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

        {/* Legibility gradient (kept light so the map stays prominent) */}
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/55" />

        {/* Airport region markers with live revenue */}
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
                <span className="whitespace-nowrap text-[11px] font-semibold tracking-tight text-white/90">
                  {pin.code}
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-white/40">
                  {pin.count}
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-[#e8702a]">
                  {formatGBP(pin.revenue)}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Heading */}
        <div className="absolute top-[13%] left-0 right-0 z-50 flex flex-col items-center text-center px-5 pointer-events-none">
          <h1 className="text-white leading-[0.95]">
            <span
              className="block font-playfair italic font-normal text-3xl sm:text-5xl md:text-6xl hero-anim hero-reveal"
              style={{ letterSpacing: '-0.04em', animationDelay: '0.25s' }}
            >
              Turn dead miles
            </span>
            <span
              className="block font-normal text-3xl sm:text-5xl md:text-6xl -mt-1 hero-anim hero-reveal"
              style={{ letterSpacing: '-0.06em', animationDelay: '0.42s' }}
            >
              into revenue
            </span>
          </h1>
          <div
            className="mt-4 pointer-events-auto hero-anim hero-fade"
            style={{ animationDelay: '0.6s' }}
          >
            <button
              onClick={() => onSelectRegion(regions[0]?.id ?? 'manchester')}
              className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30"
            >
              Enter Marketplace
            </button>
          </div>
        </div>

        {/* Live activity feed (bottom-left) */}
        <div
          className="hidden sm:block absolute bottom-10 left-10 md:left-14 w-[280px] z-50 hero-anim hero-fade"
          style={{ animationDelay: '0.7s' }}
        >
          <LiveActivity events={activity} />
        </div>

        {/* Available journeys (bottom-right, above the fold) */}
        <div
          className="hidden sm:flex flex-col absolute bottom-10 right-10 md:right-14 w-[300px] z-50 hero-anim hero-fade"
          style={{ animationDelay: '0.85s' }}
        >
          <div className="rounded-2xl border border-white/10 bg-[#0e0e0e]/70 backdrop-blur-xl p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                Available Now
              </span>
              <span className="text-[11px] tabular-nums text-emerald-400">
                {totals.opportunities} live
              </span>
            </div>
            <div className="space-y-1">
              {available.map((j) => (
                <button
                  key={j.id}
                  onClick={() => onSelectRegion(j.regionId)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10"
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-white/90 min-w-0">
                    <span className="shrink-0">{j.fromCode}</span>
                    <ArrowRight size={11} className="shrink-0 text-white/40" />
                    <span className="truncate">{j.to}</span>
                  </span>
                  <span className="ml-auto flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                      <Star size={9} className="fill-current" />
                      {OPERATORS[j.operatorId].rating.toFixed(1)}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-[#e8702a]">
                      {formatGBP(j.value)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center gap-2 text-[11px] text-white/45">
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={11} className="fill-current" />
                {avgRating}
              </span>
              <span>· {ops.length} verified operators</span>
              <span className="ml-auto">{avgOnTime}% on time</span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
