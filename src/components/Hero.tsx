import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plane, ArrowRight, Star, Map as MapIcon, X } from 'lucide-react'
import L from 'leaflet'
import { DARK_TILES, DARK_ATTRIBUTION } from '../lib/map'
import {
  marketplaceTotals,
  regionMetrics,
  buildActivity,
  formatGBP,
  OPERATORS,
  STATUS_META,
  type Region,
  type Journey,
  type ActivityEvent,
} from '../data/marketplace'

const compactGBP = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${n}`

// Live network map layer
const NET = {
  available: '#F97316',
  empty: '#3B82F6',
  urgent: '#EF4444',
  operator: '#22C55E',
}

const ARC_PAIRS: [string, string][] = [
  ['manchester', 'liverpool'],
  ['manchester', 'leeds-bradford'],
  ['birmingham', 'manchester'],
  ['heathrow', 'gatwick'],
  ['luton', 'stansted'],
  ['glasgow', 'edinburgh'],
]

interface NetDot {
  id: string
  x: number
  y: number
  color: string
  pulse: boolean
}

interface NetArc {
  id: string
  d: string
}
import type { SectionKind } from './SectionScreen'

// Display view: the UK — the marketplace covers airports nationwide.
// Centred slightly north so the whole UK sits below the fixed header.
const MAP_CENTER: [number, number] = [54.9, -3.2]
const MAP_ZOOM = 6

interface PinPos {
  id: string
  code: string
  name: string
  revenueK: string
  revenue: string
  opportunities: number
  operators: number
  urgent: number
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
        className={`text-sm font-bold tabular-nums tracking-[-0.02em] ${
          accent ? 'text-[#F97316]' : 'text-[#FAFAFA]'
        }`}
      >
        {value}
      </span>
      <span className="whitespace-nowrap text-[11px] text-[#71717A]">{label}</span>
    </>
  )
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex shrink-0 items-baseline gap-1.5 rounded-md px-1 -mx-1 transition-colors hover:bg-[#18181B]"
      >
        {content}
      </button>
    )
  }
  return <span className="flex shrink-0 items-baseline gap-1.5">{content}</span>
}

function StatDivider() {
  return <span className="h-4 w-px shrink-0 bg-[#27272A]" />
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A1A1AA] opacity-50" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#A1A1AA]" />
    </span>
  )
}

function subLabel(j: Journey): string {
  if (j.status === 'empty-return' && j.seats != null) return `${j.seats} seats available`
  if ((j.status === 'cover-needed' || j.status === 'urgent') && j.responseMins != null)
    return `${j.responseMins} mins remaining`
  return j.posted
}

function OpportunityCard({ journey, onClick }: { journey: Journey; onClick: () => void }) {
  const op = OPERATORS[journey.operatorId]
  const st = STATUS_META[journey.status]
  const urgent = journey.status === 'urgent' || journey.status === 'cover-needed'
  return (
    <button
      onClick={onClick}
      className="snap-start shrink-0 w-[260px] rounded-2xl border border-[#27272A] bg-[#111113] p-4 text-left transition-colors hover:border-[#3F3F46]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${st.badge}`}>
          {journey.status === 'urgent' ? 'URGENT' : st.label}
        </span>
        <span className="text-[#FAFAFA] text-lg font-bold tabular-nums tracking-[-0.02em]">
          {formatGBP(journey.value)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-3.5 text-sm font-medium text-[#FAFAFA]">
        <Plane size={13} className="-rotate-45 text-[#A1A1AA] shrink-0" />
        <span className="shrink-0">{journey.fromCode}</span>
        <ArrowRight size={12} className="text-[#71717A] shrink-0" />
        <span className="truncate">{journey.to}</span>
      </div>

      <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-[#27272A] text-[11px]">
        <span className="flex items-center gap-1 text-[#A1A1AA] min-w-0">
          <span className="truncate">{op.name}</span>
          <span className="flex items-center gap-0.5 shrink-0">
            <Star size={9} className="fill-current text-[#FAFAFA]" />
            {op.rating.toFixed(1)}
          </span>
        </span>
        <span className={`shrink-0 ${urgent ? 'text-[#F59E0B]' : 'text-[#71717A]'}`}>
          {subLabel(journey)}
        </span>
      </div>
    </button>
  )
}

interface FeedItem {
  id: number
  event: ActivityEvent
  age: number
}

function LiveActivity({ events }: { events: ActivityEvent[] }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const idx = useRef(0)
  const uid = useRef(0)

  useEffect(() => {
    if (!events.length) return
    const seed: FeedItem[] = []
    for (let i = 0; i < 4; i++) {
      seed.push({ id: uid.current++, event: events[i % events.length], age: (i + 1) * 11 })
    }
    setItems(seed)
    idx.current = 4
    const t = setInterval(() => {
      setItems((prev) => {
        const aged = prev.map((it) => ({ ...it, age: it.age + 3 }))
        const next = { id: uid.current++, event: events[idx.current % events.length], age: 0 }
        idx.current++
        return [next, ...aged].slice(0, 4)
      })
    }, 3000)
    return () => clearInterval(t)
  }, [events])

  const fmt = (a: number) => (a < 60 ? `${a}s ago` : `${Math.floor(a / 60)}m ago`)

  return (
    <div className="rounded-2xl border border-[#27272A] bg-[#111113]/80 backdrop-blur-xl p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
        <LiveDot />
        Live Activity
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 text-xs">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#52525B]" />
            <span className="min-w-0 flex-1 truncate text-[#A1A1AA]">
              {it.event.operator} {it.event.verb} {it.event.code}{' '}
              <ArrowRight size={11} className="inline-block align-middle text-[#52525B]" />{' '}
              {it.event.to} · {it.event.value}
            </span>
            <span className="shrink-0 text-[10px] text-[#52525B]">{fmt(it.age)}</span>
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
  onOpenOperators: () => void
  onOpenPricing: () => void
  onOpenJoin: () => void
  onOpenJourney: (journey: Journey) => void
}

export default function Hero({
  regions,
  onSelectRegion,
  onOpenSection,
  onOpenOperators,
  onOpenPricing,
  onOpenJoin,
  onOpenJourney,
}: HeroProps) {
  const totals = marketplaceTotals(regions)
  const activity = useMemo(() => buildActivity(regions), [regions])

  const opportunities = useMemo(() => {
    const all = regions.flatMap((r) => r.journeys)
    const pick = (status: Journey['status'], n: number) =>
      all
        .filter((j) => j.status === status)
        .sort((a, b) => b.value - a.value)
        .slice(0, n)
    return [
      ...pick('urgent', 2),
      ...pick('cover-needed', 2),
      ...pick('empty-return', 2),
      ...pick('available', 3),
    ]
  }, [regions])

  const [mapMode, setMapMode] = useState(false)
  const [activePin, setActivePin] = useState<string | null>(null)
  const [net, setNet] = useState<{ dots: NetDot[]; arcs: NetArc[] }>({ dots: [], arcs: [] })
  const baseDivRef = useRef<HTMLDivElement>(null)
  const baseMapRef = useRef<L.Map | null>(null)
  const regionsRef = useRef(regions)
  regionsRef.current = regions
  const [pins, setPins] = useState<PinPos[]>([])

  const computePins = useCallback(() => {
    const map = baseMapRef.current
    if (!map) return
    setPins(
      regionsRef.current.map((r) => {
        const p = map.latLngToContainerPoint(r.center)
        const m = regionMetrics(r)
        return {
          id: r.id,
          code: r.code,
          name: r.name,
          revenueK: compactGBP(m.revenue),
          revenue: formatGBP(m.revenue),
          opportunities: m.opportunities,
          operators: new Set(r.journeys.map((j) => j.operatorId)).size,
          urgent: r.journeys.filter((j) => j.status === 'urgent').length,
          x: p.x,
          y: p.y,
        }
      })
    )

    // Live network layer: opportunity dots, urgent markers, operator dots, arcs
    const dots: NetDot[] = []
    regionsRef.current.forEach((r) => {
      r.journeys.slice(0, 2).forEach((j) => {
        const p = map.latLngToContainerPoint([j.lat, j.lng])
        const color =
          j.status === 'available'
            ? NET.available
            : j.status === 'empty-return'
              ? NET.empty
              : NET.urgent
        dots.push({ id: j.id, x: p.x, y: p.y, color, pulse: j.status === 'urgent' })
      })
      // one operator-online indicator per airport
      const o = map.latLngToContainerPoint([r.center[0] + 0.16, r.center[1] + 0.18])
      dots.push({ id: `${r.id}-op`, x: o.x, y: o.y, color: NET.operator, pulse: true })
    })

    const centerById = new Map(regionsRef.current.map((r) => [r.id, r.center]))
    const arcs: NetArc[] = []
    ARC_PAIRS.forEach(([a, b]) => {
      const ca = centerById.get(a)
      const cb = centerById.get(b)
      if (!ca || !cb) return
      const p1 = map.latLngToContainerPoint(ca)
      const p2 = map.latLngToContainerPoint(cb)
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const len = Math.hypot(dx, dy) || 1
      const off = Math.min(len * 0.22, 44)
      const cx = (p1.x + p2.x) / 2 - (dy / len) * off
      const cy = (p1.y + p2.y) / 2 + (dx / len) * off
      arcs.push({ id: `${a}-${b}`, d: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}` })
    })

    setNet({ dots, arcs })
  }, [])

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

  useEffect(() => {
    computePins()
  }, [regions, computePins])

  const navItemClass =
    'text-[#A1A1AA] px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[#27272A] hover:text-[#FAFAFA] transition-colors'

  return (
    <>
      {/* Fixed header: nav + stats bar + opportunities ticker */}
      <div className="fixed top-0 left-0 right-0 z-[100]">
      <nav className="flex items-center px-4 py-3 sm:p-5">
        {/* Left: nav links (desktop) */}
        <div className="flex-1 flex justify-start">
          <div className="hidden md:flex bg-[#111113]/80 backdrop-blur-md border border-[#27272A] rounded-full px-2 py-2 items-center gap-1">
            <button className="bg-[#27272A] text-[#FAFAFA] px-4 py-1.5 rounded-full text-sm font-medium">
              Marketplace
            </button>
            <button onClick={() => onOpenSection('empty')} className={navItemClass}>
              Empty Miles
            </button>
            <button onClick={() => onOpenSection('cover')} className={navItemClass}>
              Cover
            </button>
            <button onClick={onOpenOperators} className={navItemClass}>
              Operators
            </button>
            <button onClick={onOpenPricing} className={navItemClass}>
              Pricing
            </button>
          </div>
        </div>

        {/* Center: brand + tagline */}
        <div className="flex flex-col items-center shrink-0 leading-tight">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 256 256" fill="#FAFAFA">
              <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
            </svg>
            <span className="text-[#FAFAFA] text-xl md:text-2xl font-playfair italic">Wasted Miles</span>
          </div>
          <span className="hidden md:block mt-0.5 text-xs text-[#A1A1AA] tracking-wide">
            Turn dead miles into revenue
          </span>
        </div>

        {/* Right: Join (desktop) */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={onOpenJoin}
            className="hidden md:block bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium px-6 py-2.5 rounded-full transition-colors"
          >
            Join the Network
          </button>
        </div>
      </nav>

      {/* Desktop stats bar */}
      <div className="hidden md:block border-b border-[#27272A] bg-[#09090B]/80 backdrop-blur-md">
        <div className="no-scrollbar flex items-center gap-4 overflow-x-auto px-5 py-2">
          <Stat value={totals.opportunities} label="Active Opportunities" />
          <StatDivider />
          <Stat value={formatGBP(totals.revenue)} label="Revenue Available" />
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
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-[#A1A1AA]">
            <LiveDot />
            Live Updating
          </span>
        </div>
      </div>

      {/* Mobile revenue hero — the single focus */}
      {!mapMode && (
        <div className="md:hidden border-b border-[#27272A] bg-[#09090B]/90 backdrop-blur-md px-5 pt-1 pb-4">
          <div className="flex items-center gap-2 text-[#A1A1AA] text-[11px] font-medium uppercase tracking-wider">
            <LiveDot />
            Revenue Available
          </div>
          <div className="mt-1.5 text-[#FAFAFA] text-[44px] leading-none font-bold tabular-nums tracking-[-0.03em]">
            {formatGBP(totals.revenue)}
          </div>
          <div className="mt-3 flex items-center gap-5">
            <div>
              <span className="text-[#FAFAFA] text-base font-bold tabular-nums">
                {totals.opportunities}
              </span>
              <span className="ml-1.5 text-[11px] text-[#71717A]">Opportunities</span>
            </div>
            <div className="h-4 w-px bg-[#27272A]" />
            <div>
              <span className="text-[#FAFAFA] text-base font-bold tabular-nums">
                {totals.coverRequests}
              </span>
              <span className="ml-1.5 text-[11px] text-[#71717A]">Cover Requests</span>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities ticker (hidden on mobile in map mode) */}
      <div
        className={`${mapMode ? 'hidden md:block' : 'block'} border-b border-[#27272A] bg-[#09090B]/60 backdrop-blur-md`}
      >
        <div
          className="overflow-hidden"
          style={{
            maskImage:
              'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)',
          }}
        >
          <div className="flex w-max gap-3 py-3 animate-marquee">
            {[...opportunities, ...opportunities].map((j, i) => (
              <OpportunityCard
                key={`${j.id}-${i}`}
                journey={j}
                onClick={() => onOpenJourney(j)}
              />
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Hero section */}
      <section
        className="relative w-full overflow-hidden h-screen bg-[#09090B]"
        style={{ height: '100dvh' }}
      >
        <div ref={baseDivRef} className="absolute inset-0 z-10" />

        {/* Live network layer */}
        <svg className="absolute inset-0 z-[15] w-full h-full pointer-events-none" aria-hidden>
          {net.arcs.map((a) => (
            <path
              key={a.id}
              d={a.d}
              fill="none"
              stroke={NET.empty}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              className="arc-flow"
            />
          ))}
          {net.dots.map((d) => (
            <circle
              key={d.id}
              cx={d.x}
              cy={d.y}
              r={3}
              fill={d.color}
              stroke="#09090B"
              strokeWidth={1}
              className={d.pulse ? 'net-pulse' : undefined}
            />
          ))}
        </svg>

        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-[#09090B]/40 via-transparent to-[#09090B]/70" />

        {/* Mobile: dim the map so it reads as secondary until map mode */}
        {!mapMode && (
          <div className="md:hidden absolute inset-0 z-20 pointer-events-none bg-[#09090B]/70" />
        )}

        {/* Airport region markers */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          {activePin && (
            <div
              className="absolute inset-0 pointer-events-auto"
              onClick={() => setActivePin(null)}
            />
          )}
          {pins.map((pin) => {
            const active = activePin === pin.id
            return (
              <div
                key={pin.id}
                style={{ left: pin.x, top: pin.y }}
                className="group absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              >
                {/* subtle live pulse */}
                <span
                  aria-hidden
                  className="chip-ping absolute inset-0 rounded-lg border border-[#A1A1AA]/30"
                />
                {/* Compact marker: code + value */}
                <button
                  onClick={() => setActivePin(active ? null : pin.id)}
                  className={`flex flex-col items-center leading-none rounded-lg border bg-[#111113]/85 px-2 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors duration-200 ${
                    pin.urgent > 0 ? 'border-[#EF4444]/50 marker-urgent' : 'border-[#27272A]'
                  } group-hover:border-[#3F3F46]`}
                >
                  <span className="text-[11px] font-semibold tracking-[-0.02em] text-[#FAFAFA]">
                    {pin.code}
                  </span>
                  <span className="mt-0.5 text-[10px] tabular-nums text-[#A1A1AA]">
                    {pin.revenueK}
                  </span>
                </button>

                {/* Detail popover (hover on desktop, tap to pin) */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 rounded-xl border border-[#27272A] bg-[#111113] p-3 text-left shadow-xl transition-opacity duration-150 ${
                    active
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
                  }`}
                >
                  <div className="text-sm font-semibold text-[#FAFAFA]">{pin.name}</div>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A]">Opportunities</span>
                      <span className="font-medium tabular-nums text-[#FAFAFA]">
                        {pin.opportunities}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A]">Available</span>
                      <span className="font-medium tabular-nums text-[#FAFAFA]">{pin.revenue}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A]">Operators online</span>
                      <span className="font-medium tabular-nums text-[#FAFAFA]">{pin.operators}</span>
                    </div>
                    {pin.urgent > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#71717A]">Urgent cover</span>
                        <span className="font-medium tabular-nums text-[#EF4444]">{pin.urgent}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectRegion(pin.id)}
                    className="mt-3 w-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium py-2 rounded-lg transition-colors"
                  >
                    View marketplace
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile map-mode controls */}
        {!mapMode ? (
          <button
            onClick={() => setMapMode(true)}
            className="md:hidden absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium px-4 py-2.5 rounded-full shadow-lg"
          >
            <MapIcon size={16} />
            View live map
          </button>
        ) : (
          <button
            onClick={() => setMapMode(false)}
            className="md:hidden absolute top-3 right-3 z-[60] flex items-center gap-1.5 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-xs font-medium px-3 py-1.5 rounded-full shadow-lg"
          >
            <X size={14} />
            Done
          </button>
        )}

        {/* Network legend */}
        <div
          className={`${mapMode ? 'flex' : 'hidden'} md:flex flex-col gap-1.5 absolute bottom-24 md:bottom-6 left-4 md:left-6 z-50 rounded-xl border border-[#27272A] bg-[#111113]/90 backdrop-blur-md px-3 py-2.5`}
        >
          {[
            { c: NET.available, label: 'Available journey' },
            { c: NET.empty, label: 'Empty return' },
            { c: NET.urgent, label: 'Urgent cover' },
            { c: NET.operator, label: 'Operator online' },
          ].map((row) => (
            <span key={row.label} className="flex items-center gap-2 text-[11px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: row.c }} />
              <span className="text-[#A1A1AA]">{row.label}</span>
            </span>
          ))}
        </div>

        {/* Live activity feed (bottom-right, desktop) */}
        <div
          className="hidden sm:block absolute bottom-24 md:bottom-10 right-10 md:right-14 w-[280px] z-50 hero-anim hero-fade"
          style={{ animationDelay: '0.7s' }}
        >
          <LiveActivity events={activity} />
        </div>
      </section>
    </>
  )
}
