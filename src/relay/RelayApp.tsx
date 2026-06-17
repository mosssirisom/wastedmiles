import { useEffect, useRef, useState } from 'react'
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
  LogOut,
  Send,
  Plus,
  UserPlus,
  Settings,
  LifeBuoy,
  MoreHorizontal,
} from 'lucide-react'
import { AuthProvider, useAuth } from '../lib/auth'
import { buyNow, placeBid, useJobs } from '../lib/jobsStore'
import { useMessages } from '../lib/messages'
import { formatGBP } from '../data/marketplace'
import {
  type NetworkSnapshot,
  useNetwork,
  useBid,
  useThreads,
  fetchProfile,
  requestCover,
  useResource,
} from './data'
import RelayMap from './RelayMap'

const ACCENT = '#06B6D4'
const BG = '#030712'
const PANEL = '#0F172A'
const LINE = '#1E293B'

type Screen = 'map' | 'bid' | 'cover' | 'profile' | 'messages' | 'thread' | 'trips'
type TabId = 'map' | 'marketplace' | 'trips' | 'profile'

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
        <div className="absolute left-1/2 -translate-x-1/2">
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
  { id: 'map', label: 'Home', icon: MapIcon },
  { id: 'marketplace', label: 'Marketplace', icon: ClipboardList },
  { id: 'trips', label: 'Trips', icon: Route },
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

function MapView({ go, network }: { go: (s: Screen) => void; network: NetworkSnapshot | null }) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const quickActions: { label: string; icon: typeof MapIcon; action: () => void }[] = [
    { label: '+ Post Job', icon: Plus, action: () => go('cover') },
    { label: 'Request Cover', icon: ClipboardList, action: () => go('cover') },
    { label: 'Invite Operator', icon: UserPlus, action: () => go('profile') },
    { label: 'Account Settings', icon: Settings, action: () => go('profile') },
    { label: 'Support', icon: LifeBuoy, action: () => go('profile') },
  ]

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Floating map controls — no solid bar; they blend over the map like
          Uber / Apple Maps. Wrapper ignores pointer events; buttons re-enable. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)' }}
        />
        <div
          className="relative flex items-center justify-between px-5 h-12"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <button className="pointer-events-auto text-white/90 active:opacity-60" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>
            <Menu size={22} />
          </button>
          <span className="text-white text-[16px] font-semibold tracking-tight" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>
            Relay
          </span>
          <div className="pointer-events-auto relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="h-10 w-10 rounded-full flex items-center justify-center text-white/90 active:opacity-60"
              style={{ background: 'rgba(15,23,42,0.42)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
            >
              <MoreHorizontal size={21} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border text-left"
                style={{ background: 'rgba(15,23,42,0.96)', borderColor: LINE, backdropFilter: 'blur(14px)', boxShadow: '0 18px 45px rgba(0,0,0,0.45)' }}
              >
                {quickActions.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setMenuOpen(false)
                        item.action()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/85 active:opacity-70"
                    >
                      <Icon size={17} style={{ color: ACCENT }} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Isolated, self-sizing Mapbox map (fills behind the floating controls) */}
      <RelayMap network={network} resizeSignal={expanded} />

      {/* Floating jobs summary — no solid panel; blends into the map above the
          bottom nav. Wrapper ignores pointer events; content re-enables them. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: 240, background: 'linear-gradient(to top, rgba(3,7,18,0.9), rgba(3,7,18,0.45) 45%, transparent)' }}
        />
        <div className="relative px-5 pb-3 pointer-events-auto">
          <button onClick={() => setExpanded((e) => !e)} className="w-full">
            <div className="flex items-end justify-between">
              <div className="text-left">
                <div className="text-[11px] uppercase tracking-wider text-white/55">Available Jobs Today</div>
                <div className="text-[26px] font-bold text-white leading-none mt-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                  {network ? network.totalJobs : '—'} <span className="text-base font-medium text-white/55">Jobs</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-white/55">Available</div>
                <div className="text-[19px] font-bold leading-tight" style={{ color: ACCENT, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                  {network ? network.available : '—'}
                </div>
              </div>
              <div className="pl-3 pb-1 text-white/55">{expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</div>
            </div>
          </button>

          {expanded && (
            <div className="mt-3 space-y-1.5 max-h-[42vh] overflow-y-auto">
              {(network?.opportunities ?? []).map((o) => (
                <button
                  key={o.id}
                  onClick={() => go('bid')}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left active:opacity-80"
                  style={{ background: 'rgba(15,23,42,0.85)', border: `1px solid ${LINE}`, backdropFilter: 'blur(8px)' }}
                >
                  <span className="text-[13px] text-white truncate">{o.route}</span>
                  <span className="text-[13px] font-semibold shrink-0" style={{ color: ACCENT }}>
                    {o.price}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
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

const STATUS_NOTE: Partial<Record<string, string>> = {
  bidding: 'Bid placed — awaiting result',
  won: 'You won this job',
  lost: 'Outbid on this job',
}

function BidView({ go }: { go: (s: Screen) => void }) {
  const { user } = useAuth()
  const bid = useBid()
  const [amount, setAmount] = useState('')

  const open = bid?.status === 'open' || bid?.status === 'bidding'
  const note = bid?.status ? STATUS_NOTE[bid.status] : undefined

  const onBuyNow = () => {
    if (!user) return go('profile')
    if (bid?.jobId && bid.status === 'open') buyNow(bid.jobId, user.name)
  }
  const onPlaceBid = () => {
    if (!user) return go('profile')
    const value = Number(amount.replace(/[^0-9.]/g, ''))
    if (bid?.jobId && value > 0) {
      placeBid(bid.jobId, value, user.name)
      setAmount('')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">
        {bid ? bid.from : '—'} <span className="text-white/40">→</span> {bid ? bid.to : '—'}
      </h1>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={onBuyNow}
          disabled={!open}
          className="rounded-xl border p-3 text-left active:opacity-80 disabled:opacity-60"
          style={{ background: PANEL, borderColor: LINE }}
        >
          <div className="text-[11px] text-white/40">Buy It Now</div>
          <div className="text-xl font-semibold text-white mt-0.5">{bid?.buyNow ?? '—'}</div>
        </button>
        <div className="rounded-xl border p-3" style={{ background: PANEL, borderColor: LINE }}>
          <div className="text-[11px] text-white/40">Highest Bid</div>
          <div className="text-xl font-semibold text-white mt-0.5">{bid?.highestBid ?? '—'}</div>
        </div>
      </div>
      {note && <div className="mt-3 text-[12px]" style={{ color: ACCENT }}>{note}</div>}
      <h2 className="text-[13px] font-medium text-white/80 mt-6 mb-3">Bidding Timeline</h2>
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
      <div className="flex items-center gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder={open ? `Below ${bid?.buyNow ?? ''}` : 'Bidding closed'}
          disabled={!open}
          className="flex-1 border rounded-xl px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30 disabled:opacity-60"
          style={{ background: PANEL, borderColor: LINE }}
        />
        <button
          onClick={onPlaceBid}
          disabled={!open || !amount.trim()}
          className="shrink-0 rounded-xl px-4 py-3 text-sm font-semibold active:opacity-90 disabled:opacity-50"
          style={{ background: `linear-gradient(180deg, ${ACCENT}, rgba(6,182,212,0.55))`, color: BG }}
        >
          {user ? 'Place Bid' : 'Sign in'}
        </button>
      </div>
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
  const { user } = useAuth()
  const [date, setDate] = useState('09/11/2022')
  const [pickup, setPickup] = useState('Blackpool')
  const [dropoff, setDropoff] = useState('')
  const [tier, setTier] = useState('Tier - A')
  const [offer, setOffer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    // Posting a job requires an authenticated operator.
    if (!user) {
      go('profile')
      return
    }
    setSubmitting(true)
    await requestCover({ date, pickup, dropoff, tier, offer })
    setSubmitting(false)
    go('bid')
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Request Cover</h1>
      {!user && (
        <button
          onClick={() => go('profile')}
          className="w-full text-left rounded-xl border px-3.5 py-2.5 text-[13px] text-white/70 active:opacity-80"
          style={{ background: PANEL, borderColor: LINE }}
        >
          Sign in to post a job. <span style={{ color: ACCENT }}>Sign in →</span>
        </button>
      )}
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
        {!user ? 'Sign in to post' : submitting ? 'Posting…' : 'Post Job'}
      </button>
    </div>
  )
}

function ProfileView({ onOpenMessages }: { onOpenMessages: () => void }) {
  const { user, loading, signIn, signOut } = useAuth()
  const { data: profile } = useResource(fetchProfile)
  const [email, setEmail] = useState('')
  const [fleet, setFleet] = useState('')

  // Signed out — sign-in path backed by the real auth store.
  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Sign In</h1>
        <p className="text-[13px] text-white/50 -mt-1">Sign in to manage your fleet profile and jobs.</p>
        <InputField label="Fleet name" value={fleet} onChange={setFleet} placeholder="Fleet name" />
        <InputField label="Email" value={email} onChange={setEmail} placeholder="you@fleet.co.uk" />
        <button
          onClick={() => email.trim() && signIn(email.trim(), fleet.trim() || undefined)}
          disabled={loading || !email.trim()}
          className="w-full rounded-xl py-3.5 text-[15px] font-semibold active:opacity-90 disabled:opacity-60"
          style={{ background: `linear-gradient(180deg, ${ACCENT}, rgba(6,182,212,0.55))`, color: BG }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </div>
    )
  }

  // Signed in — real account details from the auth store.
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Your Profile</h1>
      <Field label="Fleet name" value={user.name} placeholder="Fleet name" />
      <Field label="Email" value={user.email} placeholder="Email" />
      <Field label="Operator ID" value={user.operatorId} placeholder="Operator ID" />
      <Field label="Phone number" value={profile?.phone} placeholder="Phone number" />
      <button
        onClick={onOpenMessages}
        className="w-full flex items-center justify-between rounded-xl border px-3.5 py-3 text-left active:opacity-80"
        style={{ background: PANEL, borderColor: LINE }}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-white/80">
          <MessageSquare size={17} />
          Messages
        </span>
        <span className="text-xs text-white/35">Open</span>
      </button>
      <div>
        <label className="block text-[11px] text-white/40 mb-1.5">Upload License Photo</label>
        <button className="w-full h-28 rounded-xl border flex items-center justify-center active:opacity-80" style={{ background: PANEL, borderColor: LINE }}>
          <Camera size={26} className="text-white/35" />
        </button>
      </div>
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium text-white/80 active:opacity-80"
        style={{ background: PANEL, borderColor: LINE }}
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  )
}

function MessagesView({ onOpen }: { onOpen: (id: string, name: string) => void }) {
  const threads = useThreads()
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1 mb-4">Messages</h1>
      <div className="space-y-2">
        {(threads ?? []).map((t) => (
          <button
            key={t.id}
            onClick={() => onOpen(t.id, t.name)}
            className="w-full flex items-center gap-3 rounded-xl border p-3.5 text-left active:opacity-80"
            style={{ background: PANEL, borderColor: LINE }}
          >
            <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ background: BG, border: `1px solid ${LINE}` }}>
              {t.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">{t.name}</div>
              <div className="text-xs text-white/40 truncate">{t.preview}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ThreadView({ operatorId, name }: { operatorId: string; name: string }) {
  const { getThread, sendMessage, ensureThread } = useMessages()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ensureThread(operatorId)
  }, [operatorId, ensureThread])

  const messages = getThread(operatorId)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = () => {
    const t = text.trim()
    if (!t) return
    sendMessage(operatorId, t)
    setText('')
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h1 className="text-[17px] font-semibold text-white tracking-tight px-5 pt-1 pb-3 shrink-0">{name}</h1>
      <div className="flex-1 overflow-y-auto px-5 space-y-2">
        {messages.length === 0 && (
          <div className="text-[13px] text-white/40 mt-2">No messages yet. Say hello.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[78%] rounded-2xl px-3.5 py-2 text-sm"
              style={
                m.from === 'me'
                  ? { background: ACCENT, color: BG }
                  : { background: PANEL, color: '#fff', border: `1px solid ${LINE}` }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="shrink-0 flex items-center gap-2 px-5 pt-2 pb-3 border-t" style={{ borderColor: LINE }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message…"
          className="flex-1 border rounded-xl px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30"
          style={{ background: PANEL, borderColor: LINE }}
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="shrink-0 rounded-xl p-3 active:opacity-90 disabled:opacity-50"
          style={{ background: `linear-gradient(180deg, ${ACCENT}, rgba(6,182,212,0.55))`, color: BG }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

const TRIP_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Awaiting driver', color: '#F59E0B' },
  covered: { label: 'Covered', color: ACCENT },
  completed: { label: 'Completed', color: '#22C55E' },
  open: { label: 'Open', color: '#94A3B8' },
  bidding: { label: 'Bidding', color: ACCENT },
  won: { label: 'Won', color: '#22C55E' },
  lost: { label: 'Lost', color: '#64748B' },
  expired: { label: 'Expired', color: '#64748B' },
}

function TripsView({ go }: { go: (s: Screen) => void }) {
  const { posted, market, completeJob } = useJobs()
  const mine = [...posted, ...market.filter((j) => j.status !== 'open')].sort(
    (a, b) => b.createdAt - a.createdAt
  )

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h1 className="text-[17px] font-semibold text-white tracking-tight mt-1 mb-4">Trips</h1>

      {mine.length === 0 ? (
        <div className="mt-10 text-center">
          <div className="text-sm text-white/60">No trips yet.</div>
          <button
            onClick={() => go('cover')}
            className="mt-4 rounded-xl px-5 py-3 text-[15px] font-semibold active:opacity-90"
            style={{ background: `linear-gradient(180deg, ${ACCENT}, rgba(6,182,212,0.55))`, color: BG }}
          >
            Post a Job
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map((j) => {
            const meta = TRIP_STATUS[j.status] ?? { label: j.status, color: '#94A3B8' }
            return (
              <div key={j.id} className="rounded-xl border p-3.5" style={{ background: PANEL, borderColor: LINE }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-white">
                    {j.fromCode} <span className="text-white/40">→</span> {j.to}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: ACCENT }}>
                    {formatGBP(j.myBid ?? j.cap)}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                    style={{ color: meta.color, background: meta.color + '22' }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {j.source === 'me' ? 'Posted' : 'Bid'}
                    {j.driverName ? ` · ${j.driverName}` : ''}
                  </span>
                </div>
                {j.source === 'me' && j.status === 'covered' && (
                  <button
                    onClick={() => completeJob(j.id)}
                    className="mt-3 w-full rounded-lg py-2.5 text-sm font-semibold active:opacity-90"
                    style={{ background: `linear-gradient(180deg, ${ACCENT}, rgba(6,182,212,0.55))`, color: BG }}
                  >
                    Mark complete
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  App                                                                         */
/* -------------------------------------------------------------------------- */

export default function RelayApp() {
  const [screen, setScreen] = useState<Screen>('map')
  const [activeOp, setActiveOp] = useState<{ id: string; name: string } | null>(null)
  const network = useNetwork()

  const openThread = (id: string, name: string) => {
    setActiveOp({ id, name })
    setScreen('thread')
  }

  const activeTab: TabId =
    screen === 'map'
      ? 'map'
      : screen === 'cover'
        ? 'marketplace'
        : screen === 'trips'
          ? 'trips'
          : 'profile'

  const onTab = (id: TabId) => {
    if (id === 'map') setScreen('map')
    else if (id === 'marketplace') setScreen('cover')
    else if (id === 'trips') setScreen('trips')
    else setScreen('profile')
  }

  return (
    <AuthProvider>
      <div className="w-full flex justify-center" style={{ background: '#020509' }}>
        <div
          className="relative w-full max-w-[480px] flex flex-col overflow-hidden"
          style={{
            background: BG,
            height: '100dvh',
            // Map screen is full-bleed to the top (controls float over the map
            // and handle the safe area themselves); other screens inset.
            paddingTop: screen === 'map' ? 0 : 'env(safe-area-inset-top)',
          }}
        >
          {screen === 'thread' ? (
            <TopBar onBack={() => setScreen('messages')} />
          ) : screen !== 'map' ? (
            <TopBar onBack={() => setScreen('map')} />
          ) : null}

          {screen === 'map' && <MapView go={setScreen} network={network} />}
          {screen === 'bid' && <BidView go={setScreen} />}
          {screen === 'cover' && <CoverView go={setScreen} />}
          {screen === 'trips' && <TripsView go={setScreen} />}
          {screen === 'profile' && <ProfileView onOpenMessages={() => setScreen('messages')} />}
          {screen === 'messages' && <MessagesView onOpen={openThread} />}
          {screen === 'thread' && activeOp && (
            <ThreadView operatorId={activeOp.id} name={activeOp.name} />
          )}

          <BottomNav active={activeTab} onTab={onTab} />
        </div>
      </div>
    </AuthProvider>
  )
}
