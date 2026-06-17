import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Menu,
  ArrowLeft,
  Search,
  ClipboardList,
  Map as MapIcon,
  Route,
  MessageSquare,
  User,
  ChevronUp,
  ChevronDown,
  Camera,
} from 'lucide-react'
import {
  type Airport,
  type NetworkSnapshot,
  fetchNetwork,
  fetchBid,
  fetchThreads,
  fetchProfile,
  requestCover,
  useResource,
} from './data'

const ACCENT = '#06B6D4'
const BG = '#030712'
const PANEL = '#0F172A'
const LINE = '#1E293B'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

type Screen = 'map' | 'bid' | 'cover' | 'profile' | 'messages'
type TabId = 'marketplace' | 'map' | 'trips' | 'messages' | 'profile'

/* -------------------------------------------------------------------------- */
/*  Shell                                                                       */
/* -------------------------------------------------------------------------- */

function TopBar({ map, onBack }: { map?: boolean; onBack?: () => void }) {
  return (
    <div className="relative flex items-center justify-between px-5 h-12 shrink-0 z-40">
      <button onClick={onBack} className="text-white/80 active:opacity-60">
        {map ? <Menu size={20} /> : <ArrowLeft size={20} />}
      </button>
      {map && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
            <path d="M2 4 C5 1.5 15 1.5 18 4" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M2 7.5 C5 5 15 5 18 7.5" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.75" />
            <path d="M2 11 C5 8.5 15 8.5 18 11" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.5" />
          </svg>
          <span className="text-white text-[16px] font-semibold tracking-tight">Relay</span>
        </div>
      )}
      <button className="text-white/80 active:opacity-60">
        <Search size={19} />
      </button>
    </div>
  )
}

const TABS: { id: TabId; label: string; icon: typeof MapIcon }[] = [
  { id: 'marketplace', label: 'Marketplace', icon: ClipboardList },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'trips', label: 'Trips', icon: Route },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'profile', label: 'Profile', icon: User },
]

function BottomNav({ active, onTab }: { active: TabId; onTab: (id: TabId) => void }) {
  return (
    <div
      className="mt-auto shrink-0 border-t px-1 pt-2.5 flex justify-around z-40"
      style={{ background: BG, borderColor: LINE, paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      {TABS.map((t) => {
        const Icon = t.icon
        const on = t.id === active
        return (
          <button key={t.id} onClick={() => onTab(t.id)} className="flex flex-col items-center gap-1 w-[64px] active:opacity-60">
            <Icon size={20} className={on ? '' : 'text-white/40'} style={on ? { color: ACCENT, filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.6))' } : undefined} />
            <span className="text-[10px] tracking-tight" style={{ color: on ? ACCENT : 'rgba(255,255,255,0.4)' }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Map screen (real dark tiles + projected overlays)                           */
/* -------------------------------------------------------------------------- */

function Hotspot({ airport, pt }: { airport: Airport; pt: { x: number; y: number } }) {
  const primary = airport.primary
  return (
    <div className="absolute z-20 flex flex-col items-center" style={{ left: pt.x, top: pt.y, transform: 'translate(-50%, -100%)' }}>
      <div
        className="rounded-xl border px-3 py-2 text-center"
        style={{
          background: 'rgba(15,23,42,0.95)',
          borderColor: primary ? 'rgba(6,182,212,0.6)' : LINE,
          boxShadow: primary ? '0 0 22px rgba(6,182,212,0.45)' : '0 8px 20px rgba(0,0,0,0.55)',
        }}
      >
        <div className="text-[12px] font-bold text-white leading-none">{airport.code}</div>
        <div className="text-[10px] text-white/50 mt-1 leading-none">{airport.jobs} Jobs</div>
        <div className="text-[13px] font-bold leading-tight mt-0.5" style={{ color: ACCENT }}>
          {airport.rev}
        </div>
      </div>
      <div className="h-2 w-2 rotate-45 -mt-1 border-r border-b" style={{ background: 'rgba(15,23,42,0.95)', borderColor: primary ? 'rgba(6,182,212,0.6)' : LINE }} />
      <div className="relative mt-1 flex items-center justify-center">
        <span className="absolute h-5 w-5 rounded-full animate-ping" style={{ background: 'rgba(6,182,212,0.35)' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: ACCENT, boxShadow: '0 0 12px rgba(6,182,212,0.9)' }} />
      </div>
    </div>
  )
}

function MapView({ go, network }: { go: (s: Screen) => void; network: NetworkSnapshot | null }) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [pts, setPts] = useState<Record<string, { x: number; y: number }> | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Initialise the dark-tile basemap once.
  useEffect(() => {
    const el = mapDivRef.current
    if (!el || mapRef.current) return
    const map = L.map(el, {
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    })
    mapRef.current = map
    L.tileLayer(DARK_TILES, { subdomains: 'abcd', attribution: ATTR, maxZoom: 19 }).addTo(map)
    map.setView([53, -2], 6)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Fit + project the airports once the network snapshot has loaded.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !network) return
    const airports = network.airports
    const bounds = L.latLngBounds(airports.map((a) => [a.lat, a.lng] as [number, number]))
    const compute = () => {
      map.invalidateSize()
      map.fitBounds(bounds, { paddingTopLeft: [64, 110], paddingBottomRight: [64, 320] })
      const next: Record<string, { x: number; y: number }> = {}
      airports.forEach((a) => {
        const p = map.latLngToContainerPoint([a.lat, a.lng])
        next[a.code] = { x: p.x, y: p.y }
      })
      setPts(next)
    }
    setTimeout(compute, 0)
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [network])

  const ready = !!(pts && network)
  const dotCss =
    ready &&
    `.relaydot{position:absolute;width:4px;height:4px;border-radius:9999px;background:${ACCENT};box-shadow:0 0 8px ${ACCENT};transform:translate(-50%,-50%);}
${network!.routes
      .map(
        (r, i) =>
          `@keyframes relayflow${i}{0%{left:${pts![r.from].x}px;top:${pts![r.from].y}px;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:${pts![r.to].x}px;top:${pts![r.to].y}px;opacity:0}}`
      )
      .join('\n')}`

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* real dark tiles */}
      <div ref={mapDivRef} className="absolute inset-0 z-0" />
      {/* depth/vignette over tiles */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{ background: 'radial-gradient(120% 80% at 55% 35%, rgba(6,182,212,0.05), transparent 55%), linear-gradient(to bottom, transparent 55%, rgba(3,7,18,0.85))' }}
      />

      {ready && (
        <>
          <style>{dotCss}</style>

          {/* heatmap */}
          {network!.airports.map((a) => (
            <div
              key={a.code}
              className="absolute z-[6] rounded-full blur-2xl pointer-events-none"
              style={{
                left: pts![a.code].x,
                top: pts![a.code].y,
                width: 150 + a.jobs * 5,
                height: 150 + a.jobs * 5,
                transform: 'translate(-50%,-50%)',
                background: 'radial-gradient(closest-side, rgba(6,182,212,0.25), transparent)',
              }}
            />
          ))}

          {/* routes */}
          <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
            {network!.routes.map((r, i) => (
              <line
                key={i}
                x1={pts![r.from].x}
                y1={pts![r.from].y}
                x2={pts![r.to].x}
                y2={pts![r.to].y}
                stroke={ACCENT}
                strokeOpacity="0.3"
                strokeWidth="1.3"
                strokeDasharray="3 7"
                strokeLinecap="round"
                className="arc-flow"
              />
            ))}
          </svg>

          {/* live moving dots */}
          {network!.routes.flatMap((_r, i) =>
            [0, 1.4, 2.8].map((delay, j) => (
              <span key={`${i}-${j}`} className="relaydot z-10" style={{ animation: `relayflow${i} 4s linear infinite`, animationDelay: `-${delay}s` }} />
            ))
          )}

          {/* hotspots */}
          {network!.airports.map((a) => (
            <Hotspot key={a.code} airport={a} pt={pts![a.code]} />
          ))}
        </>
      )}

      {/* bottom sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 z-30 rounded-t-2xl border-t px-5 pt-2.5 pb-4"
        style={{ background: 'rgba(15,23,42,0.97)', borderColor: LINE, backdropFilter: 'blur(10px)' }}
      >
        <button onClick={() => setExpanded((e) => !e)} className="w-full">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <div className="flex items-end justify-between">
            <div className="text-left">
              <div className="text-[11px] uppercase tracking-wider text-white/45">Available Jobs Today</div>
              <div className="text-[26px] font-bold text-white leading-none mt-1">
                {network ? network.totalJobs : '—'} <span className="text-base font-medium text-white/45">Jobs</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-white/45">Available</div>
              <div className="text-[19px] font-bold leading-tight" style={{ color: ACCENT }}>
                {network ? network.available : '—'}
              </div>
            </div>
            <div className="pl-3 pb-1 text-white/40">{expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</div>
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: LINE }}>
            <div className="text-[12px] font-medium text-white/80 mb-2">Top Opportunities</div>
            <div className="space-y-1.5">
              {(network?.opportunities ?? []).map((o) => (
                <button
                  key={o.id}
                  onClick={() => go('bid')}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left active:opacity-80"
                  style={{ background: BG, border: `1px solid ${LINE}` }}
                >
                  <span className="text-[13px] text-white truncate">{o.route}</span>
                  <span className="text-[13px] font-semibold shrink-0" style={{ color: ACCENT }}>
                    {o.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Secondary screens                                                           */
/* -------------------------------------------------------------------------- */

function Field({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] text-white/40 mb-1.5">{label}</label>
      <div className="border rounded-xl px-3.5 py-3" style={{ background: PANEL, borderColor: LINE }}>
        <span className={`text-sm ${value ? 'text-white' : 'text-white/30'}`}>{value ?? placeholder}</span>
      </div>
    </div>
  )
}

function BidView({ go }: { go: (s: Screen) => void }) {
  const { data: bid, loading } = useResource(fetchBid)
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">
        {bid ? bid.from : '—'} <span className="text-white/40">→</span> {bid ? bid.to : '—'}
      </h1>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[
          ['Buy It Now', bid?.buyNow ?? '—'],
          ['Highest Bid', bid?.highestBid ?? '—'],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border p-3" style={{ background: PANEL, borderColor: LINE }}>
            <div className="text-[11px] text-white/40">{l}</div>
            <div className="text-xl font-semibold text-white mt-0.5">{v}</div>
          </div>
        ))}
      </div>
      <h2 className="text-[13px] font-medium text-white/80 mt-6 mb-3">Bidding Timeline</h2>
      {loading && <div className="text-[12px] text-white/30">Loading bids…</div>}
      {(bid?.timeline ?? []).map((row, i, arr) => (
        <div key={row.name} className="relative pl-7 pb-4">
          {i < arr.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-white/10" />}
          <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-white/30" style={{ background: PANEL }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] text-white">{row.name}</div>
              <div className="text-[11px] text-white/40">{row.note}</div>
            </div>
            <span className="text-[13px] font-medium text-white">{row.amount}</span>
          </div>
        </div>
      ))}
      <h2 className="text-[13px] font-medium text-white/80 mt-4 mb-2">Entry</h2>
      <button onClick={() => go('cover')} className="w-full text-left border rounded-xl px-3.5 py-3 active:opacity-80" style={{ background: PANEL, borderColor: LINE }}>
        <span className="text-sm text-white/30">Entry floor here...</span>
      </button>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-white/40 mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-xl px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30"
        style={{ background: PANEL, borderColor: LINE }}
      />
    </div>
  )
}

function CoverView({ go }: { go: (s: Screen) => void }) {
  const [date, setDate] = useState('09/11/2022')
  const [pickup, setPickup] = useState('Blackpool')
  const [dropoff, setDropoff] = useState('')
  const [tier, setTier] = useState('Tier - A')
  const [offer, setOffer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    await requestCover({ date, pickup, dropoff, tier, offer })
    setSubmitting(false)
    go('bid')
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Request Cover</h1>
      <InputField label="Date" value={date} onChange={setDate} />
      <InputField label="Pickup" value={pickup} onChange={setPickup} />
      <InputField label="Drop-off" value={dropoff} onChange={setDropoff} placeholder="Drop-off" />
      <InputField label="Tier" value={tier} onChange={setTier} />
      <InputField label="Offer" value={offer} onChange={setOffer} placeholder="Your Offer" />
      <div className="text-[13px] text-white/60">
        Your Max Offer: <span className="text-white font-medium">£70</span>
      </div>
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-xl py-3.5 text-[15px] font-semibold active:opacity-90 disabled:opacity-60"
        style={{ background: `linear-gradient(180deg, ${ACCENT}, rgba(6,182,212,0.55))`, color: BG }}
      >
        {submitting ? 'Posting…' : 'Post Job'}
      </button>
    </div>
  )
}

function ProfileView() {
  const { data: profile } = useResource(fetchProfile)
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Complete Your Profile</h1>
      <Field label="Fleet name" value={profile?.fleetName} placeholder="Fleet name" />
      <Field label="Email" value={profile?.email} placeholder="Email" />
      <Field label="Phone number" value={profile?.phone} placeholder="Phone number" />
      <div>
        <label className="block text-[11px] text-white/40 mb-1.5">Upload License Photo</label>
        <button className="w-full h-28 rounded-xl border flex items-center justify-center active:opacity-80" style={{ background: PANEL, borderColor: LINE }}>
          <Camera size={26} className="text-white/35" />
        </button>
      </div>
    </div>
  )
}

function MessagesView() {
  const { data: threads, loading } = useResource(fetchThreads)
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1 mb-4">Messages</h1>
      {loading && <div className="text-[12px] text-white/30">Loading conversations…</div>}
      <div className="space-y-2">
        {(threads ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl border p-3.5" style={{ background: PANEL, borderColor: LINE }}>
            <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ background: BG, border: `1px solid ${LINE}` }}>
              {t.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">{t.name}</div>
              <div className="text-xs text-white/40 truncate">{t.preview}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  App                                                                         */
/* -------------------------------------------------------------------------- */

export default function RelayApp() {
  const [screen, setScreen] = useState<Screen>('map')
  const { data: network } = useResource<NetworkSnapshot>(fetchNetwork)

  const activeTab: TabId =
    screen === 'map'
      ? 'map'
      : screen === 'cover'
        ? 'marketplace'
        : screen === 'messages'
          ? 'messages'
          : screen === 'profile'
            ? 'profile'
            : 'trips'

  const onTab = (id: TabId) => {
    if (id === 'map') setScreen('map')
    else if (id === 'marketplace') setScreen('cover')
    else if (id === 'trips') setScreen('bid')
    else if (id === 'messages') setScreen('messages')
    else setScreen('profile')
  }

  return (
    <div className="w-full flex justify-center" style={{ background: '#020509' }}>
      <div
        className="relative w-full max-w-[480px] flex flex-col overflow-hidden"
        style={{
          background: BG,
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {screen === 'map' ? <TopBar map /> : <TopBar onBack={() => setScreen('map')} />}

        {screen === 'map' && <MapView go={setScreen} network={network} />}
        {screen === 'bid' && <BidView go={setScreen} />}
        {screen === 'cover' && <CoverView go={setScreen} />}
        {screen === 'profile' && <ProfileView />}
        {screen === 'messages' && <MessagesView />}

        <BottomNav active={activeTab} onTab={onTab} />
      </div>
    </div>
  )
}
