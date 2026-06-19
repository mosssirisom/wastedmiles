import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Menu, ArrowLeft, Search, ClipboardList, Map as MapIcon, Route, MessageSquare, User, LogOut, Send, Plus, UserPlus, Settings, LifeBuoy, MoreHorizontal, Star, Clock, Navigation, Users, Car, Sparkles, Briefcase, ChevronDown, Locate, LocateFixed } from 'lucide-react'
import { AuthProvider, useAuth } from '../lib/auth'
import { buyNow, placeBid, useJobs } from '../lib/jobsStore'
import { useMessages } from '../lib/messages'
import { formatGBP } from '../data/marketplace'
import { useBid, useThreads, fetchProfile, requestCover, useResource } from './data'
import RelayMap, { DRIVER_STATUS_COLOR, type DriverStatus } from './RelayMap'
import { useMarketJobs, categoryCounts, CATEGORY_META, jobBadges, whyThisJob, BADGE_COLORS, JOB_REGIONS, parsePickupMinutes, distanceToAirport, jobDistanceFrom, type Badge, type JobCategory, type MarketJob } from './marketplaceJobs'

const ACCENT = '#06B6D4'
const BG = '#030712'
const PANEL = '#0F172A'
const LINE = '#1E293B'

type Screen = 'map' | 'bid' | 'cover' | 'profile' | 'messages' | 'thread' | 'trips' | 'jobs'
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

function BadgePill({ badge }: { badge: Badge }) {
  const c = BADGE_COLORS[badge.tone]
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: c + '1f', color: c, border: `1px solid ${c}40` }}>{badge.label}</span>
}

function TrustRow({ job, compact }: { job: MarketJob; compact?: boolean }) {
  const trusted = job.operatorRating >= 4.85
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[13px] font-semibold text-white" style={{ background: '#1E293B' }}>{job.operatorName.slice(0, 1)}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-white truncate">{job.operatorName}{trusted && <Star size={12} style={{ color: '#F5D90A', fill: '#F5D90A' }} />}</div>
        {!compact && <div className="text-[11px] text-white/45">{job.operatorRating.toFixed(1)}★ · {job.operatorCompleted.toLocaleString()} jobs</div>}
      </div>
    </div>
  )
}

// Driver opportunity card — hierarchy: route, price, timing, badges, trust.
function JobCard({ job, onOpen }: { job: MarketJob; onOpen: () => void }) {
  const badges = jobBadges(job)
  return (
    <button onClick={onOpen} className="w-full text-left rounded-2xl border p-3.5 active:opacity-90" style={{ background: PANEL, borderColor: LINE }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-white truncate">{job.fromName}</div>
          <div className="flex items-center gap-1.5 text-[13px] text-white/55 truncate"><span>to</span><span className="text-white/85 font-medium">{job.toName}</span></div>
        </div>
        <div className="text-[20px] font-bold text-white leading-none shrink-0">{formatGBP(job.value)}</div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[12px] text-white/55"><Clock size={13} />{job.pickupLabel} · {job.miles} mi</div>
      {badges.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{badges.map((b) => <BadgePill key={b.label} badge={b} />)}</div>}
      <div className="mt-3 pt-3 border-t" style={{ borderColor: LINE }}><TrustRow job={job} /></div>
    </button>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border px-3 py-2.5" style={{ background: PANEL, borderColor: LINE }}><div className="text-white/45">{icon}</div><div className="mt-1 text-[10px] uppercase tracking-wide text-white/40">{label}</div><div className="text-[13px] font-semibold text-white truncate">{value}</div></div>
}

// Full job detail page — leads with the opportunity, explains "Why this job?".
function JobDetail({ job, onClose, onClaim, onMessage }: { job: MarketJob; onClose: () => void; onClaim: () => void; onMessage: () => void }) {
  const badges = jobBadges(job)
  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: BG, paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="shrink-0 flex items-center gap-3 px-4 h-12">
        <button onClick={onClose} className="text-white/80 active:opacity-60"><ArrowLeft size={20} /></button>
        <span className="text-[15px] font-semibold text-white">Job details</span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <div className="text-[12px] uppercase tracking-wide text-white/40">{CATEGORY_META[job.category].label}</div>
        <h1 className="mt-1 text-[24px] font-bold text-white leading-tight">{job.fromName}</h1>
        <div className="flex items-center gap-2 text-[16px] text-white/70"><span>to</span><span className="font-semibold text-white">{job.toName}</span></div>
        <div className="mt-4 flex items-end justify-between">
          <div><div className="text-[11px] uppercase tracking-wide text-white/40">Fare</div><div className="text-[32px] font-bold text-white leading-none">{formatGBP(job.value)}</div></div>
          <div className="text-right"><div className="text-[11px] uppercase tracking-wide text-white/40">Pickup</div><div className="text-[15px] font-semibold text-white">{job.pickupLabel}</div></div>
        </div>
        {badges.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{badges.map((b) => <BadgePill key={b.label} badge={b} />)}</div>}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Fact icon={<Navigation size={15} />} label="Distance" value={`${job.miles} mi`} />
          <Fact icon={<Users size={15} />} label="Passengers" value={String(job.passengers)} />
          <Fact icon={<Car size={15} />} label="Vehicle" value={job.vehicle} />
        </div>
        <div className="mt-5 rounded-2xl border p-4" style={{ background: 'rgba(6,182,212,0.07)', borderColor: 'rgba(6,182,212,0.25)' }}>
          <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: ACCENT }}><Sparkles size={15} />Why this job?</div>
          <p className="mt-2 text-[14px] leading-relaxed text-white/80">{whyThisJob(job)}</p>
        </div>
        <div className="mt-5 text-[13px] font-semibold text-white/85 mb-2">Operator</div>
        <div className="rounded-2xl border p-3.5 flex items-center justify-between" style={{ background: PANEL, borderColor: LINE }}>
          <TrustRow job={job} />
          <button onClick={onMessage} className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg border" style={{ borderColor: LINE, color: '#fff' }}>Message</button>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-5 pt-3 border-t" style={{ background: BG, borderColor: LINE, paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}>
        <button onClick={onClaim} className="w-full rounded-2xl py-3.5 text-[16px] font-semibold active:opacity-90" style={{ background: ACCENT, color: BG }}>Claim this job · {formatGBP(job.value)}</button>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border px-3 py-2" style={{ background: BG, borderColor: LINE }}><div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div><div className="text-[15px] font-bold text-white">{value}</div></div>
}

// Secondary analytics — only surfaced when the sheet is fully expanded.
function AnalyticsPanel({ jobs }: { jobs: MarketJob[] }) {
  const areas = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>()
    for (const j of jobs) {
      const e = map.get(j.fromCode) ?? { name: j.fromName, count: 0, value: 0 }
      e.count++; e.value += j.value; map.set(j.fromCode, e)
    }
    return [...map.entries()].map(([code, e]) => ({ code, ...e })).sort((a, b) => b.value - a.value).slice(0, 4)
  }, [jobs])
  const total = jobs.reduce((s, j) => s + j.value, 0)
  const avg = jobs.length ? Math.round(total / jobs.length) : 0
  return (
    <div className="mb-4 rounded-2xl border p-4" style={{ background: PANEL, borderColor: LINE }}>
      <div className="text-[13px] font-semibold text-white/85 mb-3">Marketplace intelligence</div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <MiniStat label="Avg fare" value={formatGBP(avg)} />
        <MiniStat label="Live value" value={formatGBP(total)} />
      </div>
      <div className="text-[11px] uppercase tracking-wide text-white/40 mb-1.5">Busiest pickup areas</div>
      <div className="space-y-1.5">
        {areas.map((a) => <div key={a.code} className="flex items-center justify-between text-[13px]"><span className="text-white/80 truncate">{a.name}</span><span className="text-white/45 shrink-0">{a.count} jobs · {formatGBP(a.value)}</span></div>)}
      </div>
    </div>
  )
}

// Large, touch-friendly job card for the Jobs browser.
function JobsCard({ job, onView }: { job: MarketJob; onView: () => void }) {
  const meta = CATEGORY_META[job.category]
  const trusted = job.operatorRating >= 4.85
  return (
    <div className="rounded-2xl border p-4" style={{ background: PANEL, borderColor: LINE }}>
      <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: meta.color }}>
        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />{meta.label}
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-white truncate">{job.fromName}</div>
          <div className="text-white/30 text-[13px] leading-tight">↓</div>
          <div className="text-[15px] font-semibold text-white truncate">{job.toName}</div>
        </div>
        <div className="text-[30px] font-bold text-white leading-none shrink-0">{formatGBP(job.value)}</div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[13px] text-white/60"><Clock size={14} />{job.pickupLabel}</div>
      <div className="mt-1.5 flex items-center gap-4 text-[13px] text-white/60">
        <span className="flex items-center gap-1.5"><Users size={14} />{job.passengers} Passengers</span>
        <span className="flex items-center gap-1.5"><Briefcase size={14} />{job.cases} Cases</span>
      </div>
      {trusted && <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: '#F5D90A' }}><Star size={13} style={{ fill: '#F5D90A' }} />Trusted Operator</div>}
      <button onClick={onView} className="mt-3.5 w-full rounded-xl py-3 text-[15px] font-semibold active:opacity-90" style={{ background: ACCENT, color: BG }}>View Job</button>
    </div>
  )
}

type JobSort = 'soon' | 'value' | 'near' | 'recent'
const SORT_LABELS: Record<JobSort, string> = { soon: 'Soonest First', value: 'Highest Value', near: 'Nearest Pickup', recent: 'Recently Added' }

function JobsView({ go }: { go: (s: Screen) => void }) {
  const jobs = useMarketJobs()
  const [regionId, setRegionId] = useState('north-west')
  const [airport, setAirport] = useState<string>('all') // 'all' | airport code
  const [sort, setSort] = useState<JobSort>('soon')
  const [sortOpen, setSortOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const region = JOB_REGIONS.find((r) => r.id === regionId) ?? JOB_REGIONS[0]
  const codes = region.airports.map((a) => a.code)

  const list = useMemo(() => {
    let r = jobs.filter((j) => codes.includes(j.fromCode))
    if (airport !== 'all') r = r.filter((j) => j.fromCode === airport)
    const ref = airport !== 'all' ? airport : codes[0]
    const arr = [...r]
    if (sort === 'soon') arr.sort((a, b) => parsePickupMinutes(a.pickupLabel) - parsePickupMinutes(b.pickupLabel))
    else if (sort === 'value') arr.sort((a, b) => b.value - a.value)
    else if (sort === 'near') arr.sort((a, b) => distanceToAirport(a, ref) - distanceToAirport(b, ref))
    else arr.sort((a, b) => a.postedMins - b.postedMins)
    return arr.slice(0, 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, regionId, airport, sort])

  const selected = selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: BG }}>
      {/* header */}
      <div className="shrink-0 px-5 pt-1 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-tight">Jobs Available</h1>
          <div className="text-[12px] text-white/45 mt-0.5">{list.length.toLocaleString()} live in {region.name}</div>
        </div>
        <button onClick={() => go('cover')} className="flex items-center gap-1 text-[13px] font-medium px-3 py-1.5 rounded-lg border active:opacity-80" style={{ borderColor: LINE, color: '#fff' }}><Plus size={15} />Post</button>
      </div>

      {/* region selector */}
      <div className="shrink-0 no-scrollbar flex gap-2 overflow-x-auto px-5 pb-2.5">
        {JOB_REGIONS.map((r) => {
          const on = r.id === regionId
          return (
            <button key={r.id} onClick={() => { setRegionId(r.id); setAirport('all') }} className="shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium active:opacity-80" style={{ background: on ? ACCENT : 'transparent', borderColor: on ? ACCENT : LINE, color: on ? BG : 'rgba(255,255,255,0.7)' }}>{r.name}</button>
          )
        })}
      </div>

      {/* airport filter */}
      {region.airports.length > 0 && (
        <div className="shrink-0 no-scrollbar flex gap-2 overflow-x-auto px-5 pb-2.5">
          {[{ code: 'all', name: `All ${region.name}` }, ...region.airports].map((a) => {
            const on = airport === a.code
            return (
              <button key={a.code} onClick={() => setAirport(a.code)} className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium active:opacity-80" style={{ background: on ? 'rgba(6,182,212,0.16)' : 'transparent', borderColor: on ? ACCENT : LINE, color: on ? '#fff' : 'rgba(255,255,255,0.6)' }}>{a.name}</button>
            )
          })}
        </div>
      )}

      {/* sort */}
      <div className="shrink-0 relative px-5 pb-2 flex items-center justify-between">
        <span className="text-[12px] text-white/40">{list.length} jobs</span>
        <button onClick={() => setSortOpen((v) => !v)} className="flex items-center gap-1.5 text-[13px] font-medium text-white/80 active:opacity-70">{SORT_LABELS[sort]}<ChevronDown size={15} /></button>
        {sortOpen && (
          <div className="absolute right-5 top-8 z-20 w-48 overflow-hidden rounded-xl border" style={{ background: 'rgba(15,23,42,0.98)', borderColor: LINE, boxShadow: '0 14px 40px rgba(0,0,0,0.5)' }}>
            {(Object.keys(SORT_LABELS) as JobSort[]).map((s) => (
              <button key={s} onClick={() => { setSort(s); setSortOpen(false) }} className="w-full text-left px-3.5 py-2.5 text-[13px] active:opacity-70" style={{ color: sort === s ? ACCENT : '#fff', background: sort === s ? 'rgba(6,182,212,0.1)' : undefined }}>{SORT_LABELS[s]}</button>
            ))}
          </div>
        )}
      </div>

      {/* cards */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 space-y-3" onClick={() => sortOpen && setSortOpen(false)}>
        {list.map((j) => <JobsCard key={j.id} job={j} onView={() => setSelectedId(j.id)} />)}
        {list.length === 0 && (
          <div className="mt-12 text-center">
            <div className="text-[14px] text-white/55">No jobs in {region.name} right now.</div>
            <div className="text-[12px] text-white/35 mt-1">Try another region.</div>
          </div>
        )}
      </div>

      {selected && <JobDetail job={selected} onClose={() => setSelectedId(null)} onClaim={() => go('bid')} onMessage={() => go('messages')} />}
    </div>
  )
}

const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = { available: 'Available', busy: 'Busy', unavailable: 'Unavailable', offline: 'Offline' }
const DRIVER_STATUS_CYCLE: DriverStatus[] = ['available', 'busy', 'unavailable', 'offline']

function MapView({ go }: { go: (s: Screen) => void }) {
  const jobs = useMarketJobs()
  const [filter, setFilter] = useState<JobCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [snap, setSnap] = useState(0) // 0 collapsed · 1 half · 2 full
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800))
  const [dragH, setDragH] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null)

  // Driver location / follow mode / status.
  const [status, setStatus] = useState<DriverStatus>('available')
  const [follow, setFollow] = useState(false)
  const [recenterKey, setRecenterKey] = useState(0)
  const [driverLoc, setDriverLoc] = useState<[number, number] | null>(null)
  const lastTap = useRef(0)

  const onLocate = () => {
    const now = Date.now()
    if (now - lastTap.current < 280) setFollow(true) // double tap → Follow Mode
    else setRecenterKey((k) => k + 1) // single tap → recenter
    lastTap.current = now
  }

  useEffect(() => {
    const f = () => setVh(window.innerHeight)
    window.addEventListener('resize', f)
    window.addEventListener('orientationchange', f)
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f) }
  }, [])

  const counts = useMemo(() => categoryCounts(jobs), [jobs])
  const visible = useMemo(
    () => jobs.filter((j) => (filter === 'all' || j.category === filter) && (!query || `${j.fromName} ${j.toName} ${j.operatorName}`.toLowerCase().includes(query.toLowerCase()))),
    [jobs, filter, query]
  )
  const liquidity = useMemo(() => visible.reduce((s, j) => s + j.value, 0), [visible])
  // Nearest opportunities first when we know the driver's location.
  const cards = useMemo(() => {
    const arr = [...visible]
    if (driverLoc) arr.sort((a, b) => jobDistanceFrom(a, driverLoc) - jobDistanceFrom(b, driverLoc))
    else arr.sort((a, b) => b.value - a.value)
    return arr.slice(0, 60)
  }, [visible, driverLoc])
  const selected = selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null

  const PEEK = 132
  const sheetMax = Math.round(vh * 0.9)
  const snaps = [PEEK, Math.round(vh * 0.56), sheetMax]
  const height = dragH ?? snaps[snap]
  const open = height > PEEK + 32
  const full = height > Math.round(vh * 0.78)

  const onDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    drag.current = { startY: e.clientY, startH: height, moved: false }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.startY
    if (Math.abs(dy) > 4) d.moved = true
    setDragH(Math.min(sheetMax, Math.max(PEEK, d.startH - dy)))
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) { setSnap((s) => (s === 0 ? 1 : 0)); setDragH(null); return }
    const cur = dragH ?? height
    let best = 0, bd = Infinity
    snaps.forEach((v, i) => { const dd = Math.abs(v - cur); if (dd < bd) { bd = dd; best = i } })
    setSnap(best)
    setDragH(null)
  }

  const chips: { id: JobCategory | 'all'; label: string; count: number; color?: string }[] = [
    { id: 'all', label: 'All', count: jobs.length },
    { id: 'airport', label: 'Airport', count: counts.airport, color: CATEGORY_META.airport.color },
    { id: 'empty-return', label: 'Empty Return', count: counts['empty-return'], color: CATEGORY_META['empty-return'].color },
    { id: 'cover', label: 'Cover', count: counts.cover, color: CATEGORY_META.cover.color },
    { id: 'urgent', label: 'Urgent', count: counts.urgent, color: CATEGORY_META.urgent.color },
  ]

  return (
    <div className="relative flex-1 min-h-0" style={{ background: BG }}>
      {/* MAP — primary interface, full bleed */}
      <RelayMap
        jobs={jobs}
        filter={filter}
        selectedId={selectedId}
        onSelectJob={setSelectedId}
        onClusterTap={() => setSelectedId(null)}
        resizeSignal={snap}
        driverStatus={status}
        follow={follow}
        recenterKey={recenterKey}
        onFollowChange={setFollow}
        onLocation={setDriverLoc}
      />

      {/* floating controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div className="absolute inset-x-0 top-0 h-28" style={{ background: 'linear-gradient(to bottom, rgba(3,7,18,0.85), transparent)' }} />
        <div className="relative flex items-center justify-between px-4 h-12" style={{ marginTop: 'env(safe-area-inset-top)' }}>
          <button className="pointer-events-auto text-white/85 active:opacity-70"><Menu size={22} /></button>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
            <span className="text-white text-[16px] font-semibold tracking-tight">Relay</span>
          </div>
          <div className="pointer-events-auto"><QuickActionsMenu go={go} /></div>
        </div>
        {/* driver status pill (future-ready: tap to cycle) */}
        <div className="relative px-4 mt-1.5">
          <button onClick={() => setStatus((s) => DRIVER_STATUS_CYCLE[(DRIVER_STATUS_CYCLE.indexOf(s) + 1) % DRIVER_STATUS_CYCLE.length])} className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium active:opacity-80" style={{ background: 'rgba(8,13,23,0.8)', borderColor: LINE, color: '#fff', backdropFilter: 'blur(8px)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: DRIVER_STATUS_COLOR[status], boxShadow: `0 0 6px ${DRIVER_STATUS_COLOR[status]}` }} />
            {DRIVER_STATUS_LABEL[status]}
          </button>
        </div>
      </div>

      {/* MY LOCATION FAB — single tap recenter, double tap Follow Mode */}
      <button
        onClick={onLocate}
        aria-label="My location"
        className="absolute right-4 z-20 h-12 w-12 rounded-full flex items-center justify-center active:scale-95"
        style={{
          bottom: 'calc(148px + env(safe-area-inset-bottom))',
          background: follow ? ACCENT : 'rgba(8,13,23,0.92)',
          border: `1px solid ${follow ? ACCENT : LINE}`,
          color: follow ? BG : '#fff',
          boxShadow: follow ? '0 0 18px rgba(6,182,212,0.55)' : '0 6px 18px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          transition: 'background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.1s',
        }}
      >
        {follow ? <LocateFixed size={21} /> : <Locate size={21} />}
      </button>

      {/* DRAGGABLE OPPORTUNITY SHEET */}
      <div className="absolute inset-x-0 bottom-0 z-30" style={{ height, transition: dragH == null ? 'height 0.28s cubic-bezier(0.16,1,0.3,1)' : 'none' }}>
        <div className="h-full rounded-t-2xl border-t flex flex-col overflow-hidden" style={{ background: 'rgba(8,13,23,0.97)', borderColor: LINE, backdropFilter: 'blur(16px)', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)' }}>
          {/* peek / drag handle */}
          <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} className="shrink-0 px-5 pt-2.5 pb-3 select-none" style={{ touchAction: 'none', cursor: 'grab' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between">
              <div><div className="text-[11px] uppercase tracking-wider text-white/45">Live jobs</div><div className="text-[22px] font-bold text-white leading-none mt-0.5">{visible.length.toLocaleString()}</div></div>
              <div className="text-right"><div className="text-[11px] uppercase tracking-wider text-white/45">Available</div><div className="text-[22px] font-bold leading-none mt-0.5" style={{ color: ACCENT }}>{formatGBP(liquidity)}</div></div>
            </div>
          </div>

          {/* body — cards + filters + search (half), analytics (full) */}
          {open && (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 mb-3" style={{ background: PANEL, borderColor: LINE }}>
                <Search size={16} className="text-white/40" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search routes, towns, operators" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
              </div>
              <div className="no-scrollbar -mx-4 px-4 flex gap-2 overflow-x-auto pb-1 mb-3">
                {chips.map((c) => {
                  const on = filter === c.id
                  return (
                    <button key={c.id} onClick={() => setFilter(c.id)} className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium active:opacity-80" style={{ background: on ? 'rgba(6,182,212,0.16)' : 'transparent', borderColor: on ? ACCENT : LINE, color: on ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                      {c.color && <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ background: c.color }} />}
                      {c.label} <span className="text-white/40">{c.count}</span>
                    </button>
                  )
                })}
              </div>
              {full && <AnalyticsPanel jobs={visible} />}
              <div className="space-y-2.5">
                {cards.map((j) => <JobCard key={j.id} job={j} onOpen={() => setSelectedId(j.id)} />)}
              </div>
              {cards.length === 0 && <div className="py-8 text-center text-[13px] text-white/35">No jobs match.</div>}
            </div>
          )}
        </div>
      </div>

      {selected && <JobDetail job={selected} onClose={() => setSelectedId(null)} onClaim={() => go('bid')} onMessage={() => go('messages')} />}
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
  const activeTab: TabId = screen === 'map' ? 'map' : screen === 'jobs' || screen === 'cover' ? 'marketplace' : screen === 'trips' ? 'trips' : 'profile'
  const onTab = (id: TabId) => { if (id === 'map') setScreen('map'); else if (id === 'marketplace') setScreen('jobs'); else if (id === 'trips') setScreen('trips'); else setScreen('profile') }
  return <AuthProvider><div className="w-full flex justify-center" style={{ background: '#020509' }}><div className="relative w-full max-w-[480px] flex flex-col overflow-hidden" style={{ background: BG, height: '100dvh', paddingTop: screen === 'map' ? 0 : 'env(safe-area-inset-top)' }}>{screen === 'thread' ? <TopBar onBack={() => setScreen('messages')} /> : screen !== 'map' && screen !== 'jobs' ? <TopBar onBack={() => setScreen('map')} /> : null}{screen === 'map' && <MapView go={setScreen} />}{screen === 'jobs' && <JobsView go={setScreen} />}{screen === 'bid' && <BidView go={setScreen} />}{screen === 'cover' && <CoverView go={setScreen} />}{screen === 'trips' && <TripsView go={setScreen} />}{screen === 'profile' && <ProfileView onOpenMessages={() => setScreen('messages')} />}{screen === 'messages' && <MessagesView onOpen={openThread} />}{screen === 'thread' && activeOp && <ThreadView operatorId={activeOp.id} name={activeOp.name} />}<BottomNav active={activeTab} onTab={onTab} /></div></div></AuthProvider>
}
