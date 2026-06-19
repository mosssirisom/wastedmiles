import { useEffect, useMemo, useRef, useState } from 'react'
import { Menu, ArrowLeft, Search, ClipboardList, Map as MapIcon, Route, MessageSquare, User, LogOut, Send, Plus, UserPlus, Settings, LifeBuoy, MoreHorizontal, X } from 'lucide-react'
import { AuthProvider, useAuth } from '../lib/auth'
import { buyNow, placeBid, useJobs } from '../lib/jobsStore'
import { useMessages } from '../lib/messages'
import { formatGBP } from '../data/marketplace'
import { useBid, useThreads, fetchProfile, requestCover, useResource } from './data'
import RelayMap from './RelayMap'
import { useMarketJobs, categoryCounts, CATEGORY_META, type JobCategory, type MarketJob } from './marketplaceJobs'

const ACCENT = '#06B6D4'
const BG = '#030712'
const PANEL = '#0F172A'
const LINE = '#1E293B'

type Screen = 'map' | 'bid' | 'cover' | 'profile' | 'messages' | 'thread' | 'trips'
type TabId = 'map' | 'marketplace' | 'trips' | 'profile'

const TABS: { id: TabId; label: string; icon: typeof MapIcon }[] = [
  { id: 'map', label: 'Home', icon: MapIcon },
  { id: 'marketplace', label: 'Jobs', icon: ClipboardList },
  { id: 'trips', label: 'Trips', icon: Route },
  { id: 'profile', label: 'Profile', icon: User },
]

function TopBar({ onBack }: { onBack?: () => void }) {
  return (
    <div className="relative flex h-12 shrink-0 items-center justify-between px-5 z-40">
      <button onClick={onBack} className="text-white/80 active:opacity-60"><ArrowLeft size={20} /></button>
      <button className="text-white/80 active:opacity-60"><Search size={19} /></button>
    </div>
  )
}

function BottomNav({ active, onTab }: { active: TabId; onTab: (id: TabId) => void }) {
  return (
    <div className="mt-auto shrink-0 border-t px-1 pt-2.5 flex justify-around z-40" style={{ background: BG, borderColor: LINE, paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
      {TABS.map((t) => {
        const Icon = t.icon
        const on = t.id === active
        return (
          <button key={t.id} onClick={() => onTab(t.id)} className="flex flex-col items-center gap-1 w-[64px] active:opacity-60">
            <Icon size={20} className={on ? '' : 'text-white/40'} style={on ? { color: ACCENT, filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.45))' } : undefined} />
            <span className="text-[10px] tracking-tight" style={{ color: on ? ACCENT : 'rgba(255,255,255,0.4)' }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function QuickActionsMenu({ go }: { go: (s: Screen) => void }) {
  const [open, setOpen] = useState(false)
  const items: { label: string; icon: typeof MapIcon; action: () => void }[] = [
    { label: '+ Post Job', icon: Plus, action: () => go('cover') },
    { label: 'Request Cover', icon: ClipboardList, action: () => go('cover') },
    { label: 'Invite Operator', icon: UserPlus, action: () => go('profile') },
    { label: 'Support', icon: LifeBuoy, action: () => go('profile') },
    { label: 'Settings', icon: Settings, action: () => go('profile') },
  ]
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="h-10 w-10 rounded-xl border flex items-center justify-center text-white/85 active:opacity-70" style={{ background: 'rgba(15,23,42,0.88)', borderColor: LINE }}><MoreHorizontal size={20} /></button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border text-left z-50" style={{ background: 'rgba(15,23,42,0.98)', borderColor: LINE, boxShadow: '0 18px 45px rgba(0,0,0,0.45)' }}>
          {items.map((item) => {
            const Icon = item.icon
            return <button key={item.label} onClick={() => { setOpen(false); item.action() }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/85 active:opacity-70"><Icon size={17} style={{ color: ACCENT }} /><span>{item.label}</span></button>
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-xl border px-2.5 py-2" style={{ background: PANEL, borderColor: LINE }}><div className="text-[10px] uppercase tracking-wide text-white/38">{label}</div><div className="mt-0.5 text-[15px] font-bold" style={{ color: accent ? ACCENT : '#fff' }}>{value}</div></div>
}

const GRID = '1fr 64px 52px'

// Colour a yield (£/mile) like a trading screen — green = strong, dim = weak.
function yieldColor(perMile: number): string {
  if (perMile >= 6) return '#22C55E'
  if (perMile >= 3) return '#06B6D4'
  return '#94A3B8'
}

function Ticker({ jobs, onPick }: { jobs: MarketJob[]; onPick: (id: string) => void }) {
  if (!jobs.length) return null
  const items = [...jobs, ...jobs] // duplicate for a seamless marquee loop
  return (
    <div className="h-7 overflow-hidden flex items-center">
      <div className="animate-marquee whitespace-nowrap flex items-center gap-5 px-3">
        {items.map((j, i) => {
          const m = CATEGORY_META[j.category]
          return (
            <button key={`${j.id}-${i}`} onClick={() => onPick(j.id)} className="inline-flex items-center gap-1.5 text-[11px] active:opacity-70">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
              <span className="text-white/75">{j.fromCode}→{j.toName}</span>
              <span className="font-mono tabular-nums font-semibold text-white">{formatGBP(j.value)}</span>
              <span className="font-mono tabular-nums" style={{ color: yieldColor(j.perMile) }}>{j.perMile.toFixed(1)}/mi</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TermStat({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="px-3 py-2 border-r last:border-r-0" style={{ borderColor: LINE }}>
      <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
      <div className="font-mono tabular-nums text-[14px] font-bold" style={{ color: danger ? '#EF4444' : accent ? ACCENT : '#fff' }}>{value}</div>
    </div>
  )
}

function JobTapeRow({ job, selected, onSelect }: { job: MarketJob; selected: boolean; onSelect: () => void }) {
  const m = CATEGORY_META[job.category]
  const fresh = job.postedMins <= 5
  return (
    <button onClick={onSelect} className="w-full grid items-center gap-2 px-3 py-2 text-left border-b active:opacity-80" style={{ gridTemplateColumns: GRID, borderColor: 'rgba(30,41,59,0.55)', background: selected ? 'rgba(6,182,212,0.12)' : undefined }}>
      <div className="min-w-0 flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.color, boxShadow: job.category === 'urgent' ? `0 0 6px ${m.color}` : undefined }} />
        <div className="min-w-0">
          <div className="text-[13px] text-white truncate">{job.fromCode} <span className="text-white/35">→</span> {job.toName}</div>
          <div className="text-[10px] text-white/35 truncate">{m.short} · {job.miles}mi · {job.operatorName}{fresh && <span style={{ color: '#22C55E' }}> · new</span>}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono tabular-nums text-[14px] font-semibold text-white">{formatGBP(job.value)}</div>
        <div className="font-mono tabular-nums text-[10px] text-white/35">{job.postedMins}m</div>
      </div>
      <div className="text-right">
        <div className="font-mono tabular-nums text-[13px] font-semibold" style={{ color: yieldColor(job.perMile) }}>{job.perMile.toFixed(1)}</div>
        <div className="text-[9px] uppercase tracking-wide text-white/30">£/mi</div>
      </div>
    </button>
  )
}

function JobDetailCard({ job, onClose, onClaim, onMessage }: { job: MarketJob; onClose: () => void; onClaim: () => void; onMessage: () => void }) {
  const meta = CATEGORY_META[job.category]
  return (
    <div className="absolute inset-x-0 bottom-0 z-40">
      <div className="mx-2 mb-2 rounded-2xl border overflow-hidden" style={{ background: 'rgba(10,16,28,0.96)', borderColor: LINE, backdropFilter: 'blur(14px)', boxShadow: '0 -10px 40px rgba(0,0,0,0.55)' }}>
        <div className="px-4 pt-3 pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}>
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: meta.color + '22', color: meta.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />{meta.label}</span>
              <div className="mt-2 text-[17px] font-semibold text-white">{job.fromCode} <span className="text-white/40">→</span> {job.toName}</div>
              <div className="text-[12px] text-white/45">{job.fromName}</div>
            </div>
            <button onClick={onClose} className="text-white/50 active:opacity-60 p-1"><X size={18} /></button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Value" value={formatGBP(job.value)} accent />
            <Stat label="Per mile" value={`£${job.perMile.toFixed(2)}`} />
            <Stat label="Distance" value={`${job.miles} mi`} />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border px-3 py-2.5" style={{ background: PANEL, borderColor: LINE }}>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-white truncate">{job.operatorName}</div>
              <div className="text-[11px] text-white/40">{job.vehicle} · {job.passengers} pax</div>
            </div>
            <button onClick={onMessage} className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg border" style={{ borderColor: LINE, color: '#fff' }}>Message</button>
          </div>
          <button onClick={onClaim} className="mt-3 w-full rounded-xl py-3 text-[15px] font-semibold active:opacity-90" style={{ background: ACCENT, color: BG }}>Claim · {formatGBP(job.value)}</button>
        </div>
      </div>
    </div>
  )
}

function MapView({ go }: { go: (s: Screen) => void }) {
  const jobs = useMarketJobs()
  const [filter, setFilter] = useState<JobCategory | 'all'>('all')
  const [sort, setSort] = useState<'yield' | 'value' | 'recent'>('yield')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const counts = useMemo(() => categoryCounts(jobs), [jobs])
  const visible = useMemo(() => (filter === 'all' ? jobs : jobs.filter((j) => j.category === filter)), [jobs, filter])
  const liquidity = useMemo(() => visible.reduce((s, j) => s + j.value, 0), [visible])
  const avgYield = useMemo(() => (visible.length ? visible.reduce((s, j) => s + j.perMile, 0) / visible.length : 0), [visible])
  const urgentCount = useMemo(() => visible.filter((j) => j.category === 'urgent').length, [visible])
  const rows = useMemo(() => {
    const r = [...visible]
    if (sort === 'yield') r.sort((a, b) => b.perMile - a.perMile)
    else if (sort === 'value') r.sort((a, b) => b.value - a.value)
    else r.sort((a, b) => a.postedMins - b.postedMins)
    return r.slice(0, 80)
  }, [visible, sort])
  const tape = useMemo(() => [...visible].sort((a, b) => b.perMile - a.perMile).slice(0, 14), [visible])
  const selected = selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null

  const chips: { id: JobCategory | 'all'; label: string; count: number; color?: string }[] = [
    { id: 'all', label: 'All', count: jobs.length },
    { id: 'airport', label: 'Airport', count: counts.airport, color: CATEGORY_META.airport.color },
    { id: 'empty-return', label: 'Empty', count: counts['empty-return'], color: CATEGORY_META['empty-return'].color },
    { id: 'cover', label: 'Cover', count: counts.cover, color: CATEGORY_META.cover.color },
    { id: 'urgent', label: 'Urgent', count: counts.urgent, color: CATEGORY_META.urgent.color },
  ]
  const sorts: { id: 'yield' | 'value' | 'recent'; label: string }[] = [
    { id: 'yield', label: 'Yield' },
    { id: 'value', label: 'Value' },
    { id: 'recent', label: 'New' },
  ]

  return (
    <div className="relative flex-1 flex flex-col min-h-0" style={{ background: BG }}>
      {/* RADAR — the map is now one panel of the terminal */}
      <div className="relative shrink-0" style={{ height: '36vh', minHeight: 248 }}>
        <RelayMap jobs={jobs} filter={filter} selectedId={selectedId} onSelectJob={setSelectedId} onClusterTap={() => setSelectedId(null)} resizeSignal={filter} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
          <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(to bottom, rgba(3,7,18,0.9), transparent)' }} />
          <div className="relative flex items-center justify-between px-4 h-12" style={{ marginTop: 'env(safe-area-inset-top)' }}>
            <button className="pointer-events-auto text-white/85 active:opacity-70"><Menu size={22} /></button>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
              <span className="text-white text-[16px] font-semibold tracking-tight">Relay</span>
            </div>
            <div className="pointer-events-auto"><QuickActionsMenu go={go} /></div>
          </div>
        </div>
        {/* live ticker tape pinned to the radar's bottom edge */}
        <div className="absolute inset-x-0 bottom-0 z-30 border-t" style={{ background: 'rgba(3,7,18,0.85)', borderColor: LINE, backdropFilter: 'blur(6px)' }}>
          <Ticker jobs={tape} onPick={setSelectedId} />
        </div>
      </div>

      {/* MARKET STATS */}
      <div className="shrink-0 grid grid-cols-4 border-b" style={{ borderColor: LINE }}>
        <TermStat label="Liquidity" value={formatGBP(liquidity)} accent />
        <TermStat label="Jobs" value={visible.length.toLocaleString()} />
        <TermStat label="Avg yield" value={`£${avgYield.toFixed(1)}/mi`} />
        <TermStat label="Urgent" value={String(urgentCount)} danger={urgentCount > 0} />
      </div>

      {/* FILTERS + SORT */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b overflow-x-auto no-scrollbar" style={{ borderColor: LINE }}>
        {chips.map((c) => {
          const on = filter === c.id
          return (
            <button key={c.id} onClick={() => { setFilter(c.id); setSelectedId(null) }} className="shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-medium active:opacity-80" style={{ background: on ? 'rgba(6,182,212,0.16)' : 'transparent', borderColor: on ? ACCENT : LINE, color: on ? '#fff' : 'rgba(255,255,255,0.65)' }}>
              {c.color && <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ background: c.color }} />}
              {c.label} <span className="text-white/40">{c.count}</span>
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {sorts.map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)} className="rounded-md px-2 py-1 text-[11px] font-medium active:opacity-80" style={{ background: sort === s.id ? 'rgba(6,182,212,0.16)' : 'transparent', color: sort === s.id ? '#fff' : 'rgba(255,255,255,0.5)' }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* ORDER BOOK */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: selected ? 240 : 0 }}>
        <div className="sticky top-0 z-10 grid items-center gap-2 px-3 py-1.5 text-[9px] uppercase tracking-wide text-white/35 border-b" style={{ gridTemplateColumns: GRID, background: BG, borderColor: LINE }}>
          <span>Route</span>
          <span className="text-right">Value</span>
          <span className="text-right">£/mi</span>
        </div>
        {rows.map((j) => <JobTapeRow key={j.id} job={j} selected={j.id === selectedId} onSelect={() => setSelectedId(j.id)} />)}
        {rows.length === 0 && <div className="px-3 py-8 text-center text-[12px] text-white/35">No opportunities in this filter.</div>}
      </div>

      {selected && <JobDetailCard job={selected} onClose={() => setSelectedId(null)} onClaim={() => go('bid')} onMessage={() => go('messages')} />}
    </div>
  )
}

function Field({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return <div><label className="block text-[11px] text-white/40 mb-1.5">{label}</label><div className="border rounded-xl px-3.5 py-3" style={{ background: PANEL, borderColor: LINE }}><span className={`text-sm ${value ? 'text-white' : 'text-white/30'}`}>{value ?? placeholder}</span></div></div>
}

const STATUS_NOTE: Partial<Record<string, string>> = { bidding: 'Bid placed — awaiting result', won: 'You won this job', lost: 'Outbid on this job' }

function BidView({ go }: { go: (s: Screen) => void }) {
  const { user } = useAuth(); const bid = useBid(); const [amount, setAmount] = useState('')
  const open = bid?.status === 'open' || bid?.status === 'bidding'; const note = bid?.status ? STATUS_NOTE[bid.status] : undefined
  const onBuyNow = () => { if (!user) return go('profile'); if (bid?.jobId && bid.status === 'open') buyNow(bid.jobId, user.name) }
  const onPlaceBid = () => { if (!user) return go('profile'); const value = Number(amount.replace(/[^0-9.]/g, '')); if (bid?.jobId && value > 0) { placeBid(bid.jobId, value, user.name); setAmount('') } }
  return <div className="flex-1 overflow-y-auto px-5 pb-4"><h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">{bid ? bid.from : '—'} <span className="text-white/40">→</span> {bid ? bid.to : '—'}</h1><div className="grid grid-cols-2 gap-3 mt-4"><button onClick={onBuyNow} disabled={!open} className="rounded-xl border p-3 text-left active:opacity-80 disabled:opacity-60" style={{ background: PANEL, borderColor: LINE }}><div className="text-[11px] text-white/40">Buy It Now</div><div className="text-xl font-semibold text-white mt-0.5">{bid?.buyNow ?? '—'}</div></button><div className="rounded-xl border p-3" style={{ background: PANEL, borderColor: LINE }}><div className="text-[11px] text-white/40">Highest Bid</div><div className="text-xl font-semibold text-white mt-0.5">{bid?.highestBid ?? '—'}</div></div></div>{note && <div className="mt-3 text-[12px]" style={{ color: ACCENT }}>{note}</div>}<h2 className="text-[13px] font-medium text-white/80 mt-6 mb-3">Bidding Timeline</h2>{(bid?.timeline ?? []).map((row) => <div key={row.name} className="flex items-center justify-between border-b py-3" style={{ borderColor: LINE }}><div><div className="text-[13px] text-white">{row.name}</div><div className="text-[11px] text-white/40">{row.note}</div></div><span className="text-[13px] font-medium text-white">{row.amount}</span></div>)}<h2 className="text-[13px] font-medium text-white/80 mt-4 mb-2">Entry</h2><div className="flex items-center gap-2"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={open ? `Below ${bid?.buyNow ?? ''}` : 'Bidding closed'} disabled={!open} className="flex-1 border rounded-xl px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30 disabled:opacity-60" style={{ background: PANEL, borderColor: LINE }} /><button onClick={onPlaceBid} disabled={!open || !amount.trim()} className="shrink-0 rounded-xl px-4 py-3 text-sm font-semibold active:opacity-90 disabled:opacity-50" style={{ background: ACCENT, color: BG }}>{user ? 'Place Bid' : 'Sign in'}</button></div></div>
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="block text-[11px] text-white/40 mb-1.5">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border rounded-xl px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30" style={{ background: PANEL, borderColor: LINE }} /></div>
}

function CoverView({ go }: { go: (s: Screen) => void }) {
  const { user } = useAuth(); const [date, setDate] = useState('09/11/2022'); const [pickup, setPickup] = useState('Blackpool'); const [dropoff, setDropoff] = useState(''); const [tier, setTier] = useState('Tier - A'); const [offer, setOffer] = useState(''); const [submitting, setSubmitting] = useState(false)
  const submit = async () => { if (!user) return go('profile'); setSubmitting(true); await requestCover({ date, pickup, dropoff, tier, offer }); setSubmitting(false); go('bid') }
  return <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4"><h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Request Cover</h1><InputField label="Date" value={date} onChange={setDate} /><InputField label="Pickup" value={pickup} onChange={setPickup} /><InputField label="Drop-off" value={dropoff} onChange={setDropoff} placeholder="Drop-off" /><InputField label="Tier" value={tier} onChange={setTier} /><InputField label="Offer" value={offer} onChange={setOffer} placeholder="Your Offer" /><button onClick={submit} disabled={submitting} className="w-full rounded-xl py-3.5 text-[15px] font-semibold active:opacity-90 disabled:opacity-60" style={{ background: ACCENT, color: BG }}>{!user ? 'Sign in to post' : submitting ? 'Posting…' : 'Post Job'}</button></div>
}

function ProfileView({ onOpenMessages }: { onOpenMessages: () => void }) {
  const { user, loading, signIn, signOut } = useAuth(); const { data: profile } = useResource(fetchProfile); const [email, setEmail] = useState(''); const [fleet, setFleet] = useState('')
  if (!user) return <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4"><h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Sign In</h1><p className="text-[13px] text-white/50 -mt-1">Sign in to manage your fleet profile and jobs.</p><InputField label="Fleet name" value={fleet} onChange={setFleet} placeholder="Fleet name" /><InputField label="Email" value={email} onChange={setEmail} placeholder="you@fleet.co.uk" /><button onClick={() => email.trim() && signIn(email.trim(), fleet.trim() || undefined)} disabled={loading || !email.trim()} className="w-full rounded-xl py-3.5 text-[15px] font-semibold active:opacity-90 disabled:opacity-60" style={{ background: ACCENT, color: BG }}>{loading ? 'Signing in…' : 'Sign In'}</button></div>
  return <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4"><h1 className="text-[17px] font-semibold text-white tracking-tight mt-1">Your Profile</h1><Field label="Fleet name" value={user.name} placeholder="Fleet name" /><Field label="Email" value={user.email} placeholder="Email" /><Field label="Operator ID" value={user.operatorId} placeholder="Operator ID" /><Field label="Phone number" value={profile?.phone} placeholder="Phone number" /><button onClick={onOpenMessages} className="w-full flex items-center justify-between rounded-xl border px-3.5 py-3 text-left active:opacity-80" style={{ background: PANEL, borderColor: LINE }}><span className="flex items-center gap-2 text-sm font-medium text-white/80"><MessageSquare size={17} />Messages</span><span className="text-xs text-white/35">Open</span></button><button onClick={signOut} className="w-full flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium text-white/80 active:opacity-80" style={{ background: PANEL, borderColor: LINE }}><LogOut size={16} />Sign out</button></div>
}

function MessagesView({ onOpen }: { onOpen: (id: string, name: string) => void }) {
  const threads = useThreads()
  return <div className="flex-1 overflow-y-auto px-5 pb-4"><h1 className="text-[17px] font-semibold text-white tracking-tight mt-1 mb-4">Messages</h1><div className="space-y-2">{(threads ?? []).map((t) => <button key={t.id} onClick={() => onOpen(t.id, t.name)} className="w-full flex items-center gap-3 rounded-xl border p-3.5 text-left active:opacity-80" style={{ background: PANEL, borderColor: LINE }}><div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ background: BG, border: `1px solid ${LINE}` }}>{t.name.slice(0, 1)}</div><div className="min-w-0"><div className="text-sm font-medium text-white">{t.name}</div><div className="text-xs text-white/40 truncate">{t.preview}</div></div></button>)}</div></div>
}

function ThreadView({ operatorId, name }: { operatorId: string; name: string }) {
  const { getThread, sendMessage, ensureThread } = useMessages(); const [text, setText] = useState(''); const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { ensureThread(operatorId) }, [operatorId, ensureThread])
  const messages = getThread(operatorId)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length])
  const send = () => { const t = text.trim(); if (!t) return; sendMessage(operatorId, t); setText('') }
  return <div className="flex-1 flex flex-col min-h-0"><h1 className="text-[17px] font-semibold text-white tracking-tight px-5 pt-1 pb-3 shrink-0">{name}</h1><div className="flex-1 overflow-y-auto px-5 space-y-2">{messages.length === 0 && <div className="text-[13px] text-white/40 mt-2">No messages yet. Say hello.</div>}{messages.map((m) => <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}><div className="max-w-[78%] rounded-2xl px-3.5 py-2 text-sm" style={m.from === 'me' ? { background: ACCENT, color: BG } : { background: PANEL, color: '#fff', border: `1px solid ${LINE}` }}>{m.text}</div></div>)}<div ref={endRef} /></div><div className="shrink-0 flex items-center gap-2 px-5 pt-2 pb-3 border-t" style={{ borderColor: LINE }}><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Message…" className="flex-1 border rounded-xl px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30" style={{ background: PANEL, borderColor: LINE }} /><button onClick={send} disabled={!text.trim()} className="shrink-0 rounded-xl p-3 active:opacity-90 disabled:opacity-50" style={{ background: ACCENT, color: BG }}><Send size={18} /></button></div></div>
}

const TRIP_STATUS: Record<string, { label: string; color: string }> = { pending: { label: 'Awaiting driver', color: '#F59E0B' }, covered: { label: 'Covered', color: ACCENT }, completed: { label: 'Completed', color: '#22C55E' }, open: { label: 'Open', color: '#94A3B8' }, bidding: { label: 'Bidding', color: ACCENT }, won: { label: 'Won', color: '#22C55E' }, lost: { label: 'Lost', color: '#64748B' }, expired: { label: 'Expired', color: '#64748B' } }

function TripsView({ go }: { go: (s: Screen) => void }) {
  const { posted, market, completeJob } = useJobs(); const mine = [...posted, ...market.filter((j) => j.status !== 'open')].sort((a, b) => b.createdAt - a.createdAt)
  return <div className="flex-1 overflow-y-auto px-5 pb-4"><h1 className="text-[17px] font-semibold text-white tracking-tight mt-1 mb-4">Trips</h1>{mine.length === 0 ? <div className="mt-10 text-center"><div className="text-sm text-white/60">No trips yet.</div><button onClick={() => go('cover')} className="mt-4 rounded-xl px-5 py-3 text-[15px] font-semibold active:opacity-90" style={{ background: ACCENT, color: BG }}>Post a Job</button></div> : <div className="space-y-2">{mine.map((j) => { const meta = TRIP_STATUS[j.status] ?? { label: j.status, color: '#94A3B8' }; return <div key={j.id} className="rounded-xl border p-3.5" style={{ background: PANEL, borderColor: LINE }}><div className="flex items-center justify-between"><div className="text-sm font-medium text-white">{j.fromCode} <span className="text-white/40">→</span> {j.to}</div><div className="text-sm font-semibold" style={{ color: ACCENT }}>{formatGBP(j.myBid ?? j.cap)}</div></div><div className="flex items-center justify-between mt-1.5"><span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ color: meta.color, background: meta.color + '22' }}>{meta.label}</span><span className="text-[11px] text-white/40">{j.source === 'me' ? 'Posted' : 'Bid'}{j.driverName ? ` · ${j.driverName}` : ''}</span></div>{j.source === 'me' && j.status === 'covered' && <button onClick={() => completeJob(j.id)} className="mt-3 w-full rounded-lg py-2.5 text-sm font-semibold active:opacity-90" style={{ background: ACCENT, color: BG }}>Mark complete</button>}</div> })}</div>}</div>
}

export default function RelayApp() {
  const [screen, setScreen] = useState<Screen>('map'); const [activeOp, setActiveOp] = useState<{ id: string; name: string } | null>(null)
  const openThread = (id: string, name: string) => { setActiveOp({ id, name }); setScreen('thread') }
  const activeTab: TabId = screen === 'map' ? 'map' : screen === 'cover' ? 'marketplace' : screen === 'trips' ? 'trips' : 'profile'
  const onTab = (id: TabId) => { if (id === 'map') setScreen('map'); else if (id === 'marketplace') setScreen('cover'); else if (id === 'trips') setScreen('trips'); else setScreen('profile') }
  return <AuthProvider><div className="w-full flex justify-center" style={{ background: '#020509' }}><div className="relative w-full max-w-[480px] flex flex-col overflow-hidden" style={{ background: BG, height: '100dvh', paddingTop: screen === 'map' ? 0 : 'env(safe-area-inset-top)' }}>{screen === 'thread' ? <TopBar onBack={() => setScreen('messages')} /> : screen !== 'map' ? <TopBar onBack={() => setScreen('map')} /> : null}{screen === 'map' && <MapView go={setScreen} />}{screen === 'bid' && <BidView go={setScreen} />}{screen === 'cover' && <CoverView go={setScreen} />}{screen === 'trips' && <TripsView go={setScreen} />}{screen === 'profile' && <ProfileView onOpenMessages={() => setScreen('messages')} />}{screen === 'messages' && <MessagesView onOpen={openThread} />}{screen === 'thread' && activeOp && <ThreadView operatorId={activeOp.id} name={activeOp.name} />}<BottomNav active={activeTab} onTab={onTab} /></div></div></AuthProvider>
}
