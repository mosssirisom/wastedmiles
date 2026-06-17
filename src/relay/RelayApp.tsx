import { useState, type ReactNode, type CSSProperties } from 'react'
import {
  Menu,
  ArrowLeft,
  Search,
  ClipboardList,
  Map as MapIcon,
  Route,
  Gavel,
  MoreHorizontal,
  Signal,
  Wifi,
  BatteryFull,
  Camera,
  ChevronDown,
} from 'lucide-react'

const ACCENT = '#00F2FE'
const BG = '#0B0D10'
const PANEL = '#12161A'
const LINE = '#1A1F26'

type Screen = 'map' | 'bid' | 'cover' | 'profile'
type TabId = 'marketplace' | 'map' | 'trips' | 'bids' | 'more'

/* -------------------------------------------------------------------------- */
/*  Shell                                                                       */
/* -------------------------------------------------------------------------- */

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative w-[375px] h-[812px] max-w-full rounded-[46px] border border-[#1A1F26] overflow-hidden flex flex-col"
      style={{ background: BG, boxShadow: '0 40px 90px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(255,255,255,0.02)' }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-black rounded-b-2xl z-30" />
      {children}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-white/25 z-30 pointer-events-none" />
    </div>
  )
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pt-3.5 pb-1 text-white text-[15px] font-semibold tracking-tight">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal size={15} />
        <Wifi size={15} />
        <BatteryFull size={22} />
      </div>
    </div>
  )
}

function RelayLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <path d="M2 4.5 C6 1.5 16 1.5 20 4.5" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M2 8 C6 5 16 5 20 8" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.8" />
        <path d="M2 11.5 C6 8.5 16 8.5 20 11.5" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.55" />
      </svg>
      <span className="text-white text-[16px] font-semibold tracking-tight">Relay</span>
    </div>
  )
}

function TopBar({ map, onBack }: { map?: boolean; onBack?: () => void }) {
  return (
    <div className="relative flex items-center justify-between px-5 h-12 shrink-0">
      <button onClick={onBack} className="text-white/80 active:opacity-60 z-10">
        {map ? <Menu size={20} /> : <ArrowLeft size={20} />}
      </button>
      {map && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <RelayLogo />
        </div>
      )}
      <button className="text-white/80 active:opacity-60 z-10">
        <Search size={19} />
      </button>
    </div>
  )
}

const TABS: { id: TabId; label: string; icon: typeof MapIcon }[] = [
  { id: 'marketplace', label: 'Marketplace', icon: ClipboardList },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'trips', label: 'Trips', icon: Route },
  { id: 'bids', label: 'Bids', icon: Gavel },
  { id: 'more', label: 'More', icon: MoreHorizontal },
]

function BottomNav({ active, onTab }: { active: TabId; onTab: (id: TabId) => void }) {
  return (
    <div
      className="mt-auto shrink-0 border-t border-[#1A1F26] px-1 pt-2.5 pb-7 flex justify-around"
      style={{ background: 'rgba(11,13,16,0.95)' }}
    >
      {TABS.map((t) => {
        const Icon = t.icon
        const on = t.id === active
        return (
          <button key={t.id} onClick={() => onTab(t.id)} className="flex flex-col items-center gap-1 w-[68px] active:opacity-60">
            <Icon
              size={20}
              className={on ? '' : 'text-white/40'}
              style={on ? { color: ACCENT, filter: 'drop-shadow(0 0 6px rgba(0,242,254,0.6))' } : undefined}
            />
            <span className="text-[10px] tracking-tight" style={on ? { color: ACCENT } : { color: 'rgba(255,255,255,0.4)' }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Map                                                                         */
/* -------------------------------------------------------------------------- */

const C: Record<string, [number, number]> = {
  Glasgow: [30, 12],
  Newcastle: [47, 22],
  Leeds: [46, 33],
  Liverpool: [33, 38],
  Manchester: [42, 39],
  Birmingham: [47, 51],
  Cardiff: [35, 61],
  London: [63, 65],
  Plymouth: [32, 75],
}

const EDGES: [keyof typeof C, keyof typeof C][] = [
  ['Glasgow', 'Newcastle'],
  ['Newcastle', 'Leeds'],
  ['Leeds', 'Manchester'],
  ['Manchester', 'Liverpool'],
  ['Leeds', 'Birmingham'],
  ['Manchester', 'Birmingham'],
  ['Birmingham', 'London'],
  ['Birmingham', 'Cardiff'],
  ['Cardiff', 'Plymouth'],
  ['Glasgow', 'Liverpool'],
  ['Leeds', 'London'],
]

function NodeDot({ name, x, y }: { name: string; x: number; y: number }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5" style={{ left: `${x}%`, top: `${y}%` }}>
      <span className="h-1.5 w-1.5 rounded-full bg-white/70" style={{ boxShadow: '0 0 8px rgba(255,255,255,0.5)' }} />
      <span className="text-[9px] text-white/40 whitespace-nowrap">{name}</span>
    </div>
  )
}

function Callout({
  code,
  value,
  volume,
  active,
  x,
  y,
}: {
  code: string
  value: string
  volume: string
  active?: boolean
  x: number
  y: number
}) {
  const style: CSSProperties = { left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)' }
  return (
    <div className="absolute flex flex-col items-center z-10" style={style}>
      {/* tooltip */}
      <div
        className="rounded-lg border px-2.5 py-1.5 text-center"
        style={{
          background: PANEL,
          borderColor: active ? 'rgba(0,242,254,0.6)' : LINE,
          boxShadow: active ? '0 0 16px rgba(0,242,254,0.4)' : '0 6px 16px rgba(0,0,0,0.5)',
        }}
      >
        <div className="text-[10px] font-semibold text-white leading-none">{code}</div>
        <div className="text-[12px] font-bold leading-tight mt-0.5" style={{ color: ACCENT }}>
          {value}
        </div>
        <div className="text-[9px] text-white/40 leading-none">{volume}</div>
      </div>
      {/* pointer */}
      <div
        className="h-2 w-2 rotate-45 -mt-1 border-r border-b"
        style={{ background: PANEL, borderColor: active ? 'rgba(0,242,254,0.6)' : LINE }}
      />
      {/* node */}
      <div className="relative mt-1 flex items-center justify-center">
        {active && (
          <span
            className="absolute h-6 w-6 rounded-full border"
            style={{ borderColor: 'rgba(0,242,254,0.7)', boxShadow: '0 0 14px rgba(0,242,254,0.5)' }}
          />
        )}
        <span
          className="h-2 w-2 rounded-full"
          style={{
            background: active ? ACCENT : '#fff',
            boxShadow: active ? '0 0 12px rgba(0,242,254,0.9)' : '0 0 8px rgba(255,255,255,0.6)',
          }}
        />
      </div>
    </div>
  )
}

function MapView({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: BG }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 45% 30%, rgba(0,242,254,0.05), transparent 55%), radial-gradient(90% 60% at 65% 80%, rgba(255,255,255,0.02), transparent 60%)',
        }}
      />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {/* faint landmass */}
        <path
          d="M34 8 C26 14 30 22 26 28 C22 34 30 36 28 42 C24 48 30 54 30 60 C32 68 26 74 32 80 C40 86 50 82 52 74 C58 72 66 70 66 62 C70 56 62 50 60 44 C58 36 52 32 48 26 C46 18 44 10 34 8 Z"
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="0.35"
        />
        {/* network paths */}
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={C[a][0]}
            y1={C[a][1]}
            x2={C[b][0]}
            y2={C[b][1]}
            stroke={ACCENT}
            strokeOpacity="0.16"
            strokeWidth="0.4"
            strokeDasharray="0.6 2"
            strokeLinecap="round"
          />
        ))}
        {/* main relay route */}
        <path
          d="M30 12 C 22 30, 42 42, 47 51 C 52 60, 58 60, 63 65"
          fill="none"
          stroke={ACCENT}
          strokeOpacity="0.5"
          strokeWidth="0.5"
          strokeDasharray="0.6 2.4"
          strokeLinecap="round"
        />
      </svg>

      {/* secondary city nodes + labels */}
      <NodeDot name="Glasgow" x={C.Glasgow[0]} y={C.Glasgow[1]} />
      <NodeDot name="Newcastle" x={C.Newcastle[0]} y={C.Newcastle[1]} />
      <NodeDot name="Leeds" x={C.Leeds[0]} y={C.Leeds[1]} />
      <NodeDot name="Cardiff" x={C.Cardiff[0]} y={C.Cardiff[1]} />
      <NodeDot name="Plymouth" x={C.Plymouth[0]} y={C.Plymouth[1]} />

      {/* hub callouts */}
      <Callout code="LPL" value="£3.1K" volume="9" x={C.Liverpool[0]} y={C.Liverpool[1]} />
      <Callout code="MAN" value="£4.2K" volume="18" x={C.Manchester[0]} y={C.Manchester[1]} />
      <Callout code="BHX" value="£4.2K" volume="11" x={C.Birmingham[0]} y={C.Birmingham[1]} />
      <Callout code="LHR" value="£5.7K" volume="14" active x={C.London[0]} y={C.London[1]} />

      {/* tap anywhere on a hub goes to bids */}
      <button onClick={() => go('bid')} className="absolute inset-0" aria-label="Open bids" style={{ background: 'transparent' }} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Secondary screens (kept navigable)                                          */
/* -------------------------------------------------------------------------- */

function InputField({ label, value, placeholder, dropdown }: { label: string; value?: string; placeholder?: string; dropdown?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] text-white/40 mb-1.5">{label}</label>
      <div className="flex items-center justify-between border rounded-xl px-3.5 py-3" style={{ background: PANEL, borderColor: LINE }}>
        <span className={`text-sm ${value ? 'text-white' : 'text-white/30'}`}>{value ?? placeholder}</span>
        {dropdown && <ChevronDown size={16} className="text-white/40" />}
      </div>
    </div>
  )
}

function BidView({ go }: { go: (s: Screen) => void }) {
  const rows = [
    ['Smith driver', 'Late bids', '£280'],
    ['Frasch driver', '22:03 bid', '£230'],
    ['Erach driver', 'Blind Bid', '£230'],
    ['Jamo driver', 'Blind Bid', '£230'],
  ]
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">
        LONDON <span className="text-white/40">→</span> MANCHESTER
      </h1>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[['Buy It Now', '£70'], ['Highest Bid', '£55']].map(([l, v]) => (
          <div key={l} className="rounded-xl border p-3" style={{ background: PANEL, borderColor: LINE }}>
            <div className="text-[11px] text-white/40">{l}</div>
            <div className="text-xl font-semibold text-white mt-0.5">{v}</div>
          </div>
        ))}
      </div>
      <h2 className="text-[13px] font-medium text-white/80 mt-6 mb-3">Bidding Timeline</h2>
      <div>
        {rows.map(([n, s, a], i) => (
          <div key={n} className="relative pl-7 pb-4">
            {i < rows.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-white/10" />}
            <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-white/30" style={{ background: PANEL }} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-white">{n}</div>
                <div className="text-[11px] text-white/40">{s}</div>
              </div>
              <span className="text-[13px] font-medium text-white">{a}</span>
            </div>
          </div>
        ))}
      </div>
      <h2 className="text-[13px] font-medium text-white/80 mt-4 mb-2">Entry</h2>
      <button
        onClick={() => go('cover')}
        className="w-full text-left border rounded-xl px-3.5 py-3 active:opacity-80"
        style={{ background: PANEL, borderColor: LINE }}
      >
        <span className="text-sm text-white/30">Entry floor here...</span>
      </button>
    </div>
  )
}

function ProfileView() {
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Complete Your Profile</h1>
      <InputField label="Fleet name" value="Blackpool" />
      <InputField label="Email" value="Blackpool" />
      <InputField label="Phone number" value="Blackpool" />
      <div>
        <label className="block text-[11px] text-white/40 mb-1.5">Upload License Photo</label>
        <button className="w-full h-28 rounded-xl border flex items-center justify-center active:opacity-80" style={{ background: PANEL, borderColor: LINE }}>
          <Camera size={26} className="text-white/35" />
        </button>
      </div>
      <div>
        <label className="block text-[11px] text-white/40 mb-1.5">Standard Vehicle Type</label>
        <div className="flex gap-1 border rounded-xl p-1" style={{ background: PANEL, borderColor: LINE }}>
          <button className="flex-1 rounded-lg bg-white/[0.08] text-white text-sm py-2 font-medium">Standard</button>
          <button className="flex-1 rounded-lg text-white/40 text-sm py-2 active:bg-white/[0.04]">Standard</button>
        </div>
      </div>
    </div>
  )
}

function CoverView({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Request Cover</h1>
      <InputField label="Date" value="09/11/2022" />
      <InputField label="Pickup" value="Blackpool" />
      <InputField label="Drop-off" placeholder="Drop-off" />
      <InputField label="Tier" value="Tier - A" dropdown />
      <InputField label="Offer" placeholder="Your Offer" />
      <div className="text-[13px] text-white/60">
        Your Max Offer: <span className="text-white font-medium">£70</span>
      </div>
      <button
        onClick={() => go('bid')}
        className="w-full rounded-xl py-3.5 text-[15px] font-semibold active:opacity-90"
        style={{ background: `linear-gradient(180deg, ${ACCENT}, rgba(0,242,254,0.55))`, color: BG }}
      >
        Post Job
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  App                                                                         */
/* -------------------------------------------------------------------------- */

export default function RelayApp() {
  const [screen, setScreen] = useState<Screen>('map')

  const activeTab: TabId =
    screen === 'map' ? 'map' : screen === 'profile' ? 'trips' : screen === 'cover' ? 'marketplace' : 'bids'

  const onTab = (id: TabId) => {
    if (id === 'map') setScreen('map')
    else if (id === 'trips') setScreen('profile')
    else if (id === 'bids') setScreen('bid')
    else if (id === 'marketplace') setScreen('cover')
    else setScreen('map')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#06080A' }}>
      <PhoneFrame>
        <StatusBar />
        {screen === 'map' && <TopBar map />}
        {screen === 'bid' && <TopBar onBack={() => setScreen('map')} />}
        {screen === 'cover' && <TopBar onBack={() => setScreen('bid')} />}
        {screen === 'profile' && <TopBar onBack={() => setScreen('map')} />}

        {screen === 'map' && <MapView go={setScreen} />}
        {screen === 'bid' && <BidView go={setScreen} />}
        {screen === 'cover' && <CoverView go={setScreen} />}
        {screen === 'profile' && <ProfileView />}

        <BottomNav active={activeTab} onTab={onTab} />
      </PhoneFrame>
    </div>
  )
}
