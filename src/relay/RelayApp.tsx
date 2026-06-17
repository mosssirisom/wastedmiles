import { useState, type ReactNode } from 'react'
import {
  Menu,
  ArrowLeft,
  Search,
  Store,
  Map as MapIcon,
  User,
  Gavel,
  MoreHorizontal,
  Signal,
  Wifi,
  BatteryFull,
  Camera,
  ChevronDown,
} from 'lucide-react'

const ACCENT = '#7DDCE8'

type Screen = 'map' | 'bid' | 'cover' | 'profile'
type TabId = 'marketplace' | 'map' | 'profile' | 'bids' | 'more'

/* -------------------------------------------------------------------------- */
/*  Reusable components                                                         */
/* -------------------------------------------------------------------------- */

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-[375px] h-[812px] max-w-full rounded-[44px] border border-white/10 bg-[#071012] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)] flex flex-col">
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

function TopBar({ back, logo, onBack }: { back?: boolean; logo?: boolean; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 h-12 shrink-0">
      <div className="flex items-center gap-2.5">
        <button onClick={onBack} className="text-white/80 active:opacity-60">
          {back ? <ArrowLeft size={20} /> : <Menu size={20} />}
        </button>
        {logo && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rotate-45 rounded-[2px] border border-white/70" />
            <span className="text-white text-[15px] font-semibold tracking-tight">Relay</span>
          </div>
        )}
      </div>
      <button className="text-white/80 active:opacity-60">
        <Search size={19} />
      </button>
    </div>
  )
}

const TABS: { id: TabId; label: string; icon: typeof Store }[] = [
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'bids', label: 'Bids', icon: Gavel },
  { id: 'more', label: 'More', icon: MoreHorizontal },
]

function BottomNav({ active, onTab }: { active: TabId; onTab: (id: TabId) => void }) {
  return (
    <div className="mt-auto shrink-0 border-t border-white/10 bg-[#071012]/95 backdrop-blur-md px-1 pt-2.5 pb-7 flex justify-around">
      {TABS.map((t) => {
        const Icon = t.icon
        const on = t.id === active
        return (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className="flex flex-col items-center gap-1 w-[68px] active:opacity-60"
          >
            <Icon size={20} style={on ? { color: ACCENT } : undefined} className={on ? '' : 'text-white/45'} />
            <span className="text-[10px] tracking-tight" style={on ? { color: ACCENT } : undefined}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function InputField({
  label,
  value,
  placeholder,
  dropdown,
}: {
  label: string
  value?: string
  placeholder?: string
  dropdown?: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] text-white/40 mb-1.5">{label}</label>
      <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-3">
        <span className={`text-sm ${value ? 'text-white' : 'text-white/30'}`}>{value ?? placeholder}</span>
        {dropdown && <ChevronDown size={16} className="text-white/40" />}
      </div>
    </div>
  )
}

function AirportPin({
  code,
  price,
  count,
  glow,
  style,
  onClick,
}: {
  code: string
  price: string
  count: string
  glow?: boolean
  style: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="absolute -translate-x-1/2 -translate-y-1/2 active:scale-95 transition-transform" style={style}>
      {glow && (
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full border border-[#7DDCE8]/40"
          style={{ boxShadow: '0 0 24px rgba(125,220,232,0.25), inset 0 0 18px rgba(125,220,232,0.12)' }}
        />
      )}
      <div
        className={`relative flex items-center gap-1.5 rounded-full border bg-[#0b1418]/90 backdrop-blur px-2 py-1 ${
          glow ? 'border-[#7DDCE8]/60' : 'border-white/10'
        }`}
        style={glow ? { boxShadow: '0 0 12px rgba(125,220,232,0.3)' } : undefined}
      >
        <span className="text-[10px] font-semibold text-white">{code}</span>
        <span className="text-[10px] font-medium" style={{ color: ACCENT }}>
          {price}
        </span>
        <span className="text-[9px] text-white/40">{count}</span>
      </div>
    </button>
  )
}

function TimelineBid({ name, sub, amount, last }: { name: string; sub: string; amount: string; last?: boolean }) {
  return (
    <div className="relative pl-7 pb-4">
      {!last && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-white/10" />}
      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[#0b1418] border border-white/30" />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] text-white">{name}</div>
          <div className="text-[11px] text-white/40">{sub}</div>
        </div>
        <span className="text-[13px] font-medium text-white">{amount}</span>
      </div>
    </div>
  )
}

function UploadBox({ label }: { label: string }) {
  return (
    <div>
      <label className="block text-[11px] text-white/40 mb-1.5">{label}</label>
      <button className="w-full h-28 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center active:bg-white/[0.04]">
        <Camera size={26} className="text-white/35" />
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Screens                                                                     */
/* -------------------------------------------------------------------------- */

const CITIES: { name: string; x: number; y: number }[] = [
  { name: 'Glasgow', x: 30, y: 9 },
  { name: 'Newcastle', x: 49, y: 19 },
  { name: 'Liverpool', x: 29, y: 30 },
  { name: 'Leeds', x: 47, y: 30 },
  { name: 'Manchester', x: 38, y: 35 },
  { name: 'Birmingham', x: 47, y: 47 },
  { name: 'Cardiff', x: 33, y: 58 },
  { name: 'London', x: 64, y: 62 },
  { name: 'Plymouth', x: 30, y: 72 },
]

function MapView({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 40% 30%, rgba(125,220,232,0.05), transparent 60%), radial-gradient(100% 60% at 60% 80%, rgba(255,255,255,0.03), transparent 60%)',
        }}
      />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path
          d="M34 6 C26 12 30 20 26 26 C22 32 30 34 28 40 C24 46 30 52 30 58 C32 66 26 72 32 78 C40 84 50 80 52 72 C58 70 66 68 66 60 C70 54 62 48 60 42 C58 34 52 30 48 24 C46 16 44 8 34 6 Z"
          fill="rgba(255,255,255,0.025)"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.4"
        />
        <path
          d="M30 9 C 22 26, 40 40, 44 50 C 50 58, 58 58, 64 62"
          fill="none"
          stroke={ACCENT}
          strokeOpacity="0.55"
          strokeWidth="0.5"
          strokeDasharray="0.5 2.5"
          strokeLinecap="round"
        />
      </svg>
      {CITIES.map((c) => (
        <div
          key={c.name}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
          style={{ left: `${c.x}%`, top: `${c.y}%` }}
        >
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span className="text-[9px] text-white/40 whitespace-nowrap">{c.name}</span>
        </div>
      ))}
      <AirportPin code="LPL" price="£3.1K" count="9" style={{ left: '27%', top: '27%' }} onClick={() => go('bid')} />
      <AirportPin code="MAN" price="£4.2K" count="18" style={{ left: '41%', top: '37%' }} onClick={() => go('bid')} />
      <AirportPin code="BHX" price="£4.2K" count="11" style={{ left: '50%', top: '47%' }} onClick={() => go('bid')} />
      <AirportPin code="LHR" price="£5.7K" count="14" glow style={{ left: '66%', top: '64%' }} onClick={() => go('bid')} />
    </div>
  )
}

function BidView({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">
        LONDON <span className="text-white/40">→</span> MANCHESTER
      </h1>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <div className="text-[11px] text-white/40">Buy It Now</div>
          <div className="text-xl font-semibold text-white mt-0.5">£70</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <div className="text-[11px] text-white/40">Highest Bid</div>
          <div className="text-xl font-semibold text-white mt-0.5">£55</div>
        </div>
      </div>
      <h2 className="text-[13px] font-medium text-white/80 mt-6 mb-3">Bidding Timeline</h2>
      <div>
        <TimelineBid name="Smith driver" sub="Late bids" amount="£280" />
        <TimelineBid name="Frasch driver" sub="22:03 bid" amount="£230" />
        <TimelineBid name="Erach driver" sub="Blind Bid" amount="£230" />
        <TimelineBid name="Jamo driver" sub="Blind Bid" amount="£230" last />
      </div>
      <h2 className="text-[13px] font-medium text-white/80 mt-4 mb-2">Entry</h2>
      <button
        onClick={() => go('cover')}
        className="w-full text-left bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-3 active:bg-white/[0.05]"
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
      <UploadBox label="Upload License Photo" />
      <div>
        <label className="block text-[11px] text-white/40 mb-1.5">Standard Vehicle Type</label>
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
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
        className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-[#05090B] active:opacity-90"
        style={{ background: `linear-gradient(180deg, ${ACCENT}, rgba(125,220,232,0.55))` }}
      >
        Post Job
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  App — one navigable phone                                                   */
/* -------------------------------------------------------------------------- */

export default function RelayApp() {
  const [screen, setScreen] = useState<Screen>('map')

  const activeTab: TabId =
    screen === 'map' ? 'map' : screen === 'profile' ? 'profile' : 'bids'

  const onTab = (id: TabId) => {
    if (id === 'map') setScreen('map')
    else if (id === 'profile') setScreen('profile')
    else if (id === 'bids') setScreen('bid')
    else if (id === 'marketplace') setScreen('cover')
    else setScreen('map')
  }

  return (
    <div className="min-h-screen bg-[#05090B] flex items-center justify-center p-4">
      <PhoneFrame>
        <StatusBar />
        {screen === 'map' && <TopBar logo />}
        {screen === 'bid' && <TopBar back onBack={() => setScreen('map')} />}
        {screen === 'cover' && <TopBar back onBack={() => setScreen('bid')} />}
        {screen === 'profile' && <TopBar back onBack={() => setScreen('map')} />}

        {screen === 'map' && <MapView go={setScreen} />}
        {screen === 'bid' && <BidView go={setScreen} />}
        {screen === 'cover' && <CoverView go={setScreen} />}
        {screen === 'profile' && <ProfileView />}

        <BottomNav active={activeTab} onTab={onTab} />
      </PhoneFrame>
    </div>
  )
}
