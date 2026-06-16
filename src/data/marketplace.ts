/* ==================================================================
 * Wasted Miles — airport transfer operator marketplace data model.
 *
 * This module replaces the old geology recruitment data. It is added
 * alongside the existing data/jobs.ts so the current UI keeps working;
 * components are migrated onto this model in a later step.
 * ================================================================== */

export type JourneyStatus = 'available' | 'empty-return' | 'cover-needed' | 'urgent'

export type JourneyVariant = 'claim' | 'match' | 'cover'

export interface Operator {
  id: string
  name: string
  rating: number // out of 5
  completed: number // journeys completed
  acceptance: number // % acceptance rate
  onTime: number // % on-time performance
  fleet: string
  memberSince: string // year joined
  serviceAreas: string[]
  vehicleTypes: string[]
}

export interface Journey {
  id: string
  regionId: string
  fromCode: string
  fromName: string
  to: string // destination / airport region edge
  value: number // Journey Value in GBP
  vehicle: string
  passengers: number
  luggage: number
  pickup: string // e.g. "Today 17:45"
  posted: string // e.g. "2 mins ago"
  status: JourneyStatus
  operatorId: string
  lat: number
  lng: number
  seats?: number // empty-return only
  responseMins?: number // cover/urgent only — time remaining
}

export interface Region {
  id: string
  name: string
  code: string // IATA
  center: [number, number]
  journeys: Journey[]
}

export interface RegionMetrics {
  opportunities: number
  revenue: number
  emptyReturns: number
  coverRequests: number
}

/* --------------------------- status badges -------------------------- */

export const STATUS_META: Record<
  JourneyStatus,
  { label: string; dot: string; badge: string }
> = {
  available: {
    label: 'Available',
    dot: '#D4D4D8',
    badge: 'bg-[#18181B] text-[#D4D4D8] border-[#27272A]',
  },
  'empty-return': {
    label: 'Empty Return',
    dot: '#D4D4D8',
    badge: 'bg-[#18181B] text-[#D4D4D8] border-[#27272A]',
  },
  'cover-needed': {
    label: 'Cover Needed',
    dot: '#F59E0B',
    badge: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40',
  },
  urgent: {
    label: 'Urgent',
    dot: '#EF4444',
    badge: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40',
  },
}

/* ----------------------------- operators ---------------------------- */

export const OPERATORS: Record<string, Operator> = {
  'ev-exec': { id: 'ev-exec', name: 'EV Exec', rating: 5.0, completed: 423, acceptance: 99.4, onTime: 98.7, fleet: 'EV Executive', memberSince: '2022', serviceAreas: ['Manchester', 'Liverpool', 'Leeds'], vehicleTypes: ['Executive EV', 'Tesla Model Y'] },
  pennine: { id: 'pennine', name: 'Pennine Cars', rating: 4.9, completed: 1208, acceptance: 97.1, onTime: 96.4, fleet: 'Saloon & MPV', memberSince: '2019', serviceAreas: ['Manchester', 'Leeds', 'Bradford', 'Sheffield'], vehicleTypes: ['Business Saloon', '8-Seat MPV', 'Estate'] },
  aire: { id: 'aire', name: 'Aire Executive', rating: 4.8, completed: 765, acceptance: 95.6, onTime: 97.9, fleet: 'Executive', memberSince: '2020', serviceAreas: ['Leeds', 'Harrogate', 'York'], vehicleTypes: ['Executive', 'Mercedes E-Class'] },
  mersey: { id: 'mersey', name: 'Mersey Premier', rating: 4.9, completed: 540, acceptance: 98.2, onTime: 99.1, fleet: 'Premier EV', memberSince: '2021', serviceAreas: ['Liverpool', 'Chester', 'Southport'], vehicleTypes: ['Premier EV', 'Luxury MPV'] },
  northern: { id: 'northern', name: 'Northern Transfers', rating: 4.7, completed: 312, acceptance: 94.0, onTime: 95.3, fleet: 'MPV Fleet', memberSince: '2023', serviceAreas: ['Carlisle', 'Kendal', 'Lancaster'], vehicleTypes: ['8-Seat MPV', 'Estate'] },
  skyline: { id: 'skyline', name: 'Skyline Chauffeurs', rating: 5.0, completed: 689, acceptance: 99.0, onTime: 98.0, fleet: 'Luxury', memberSince: '2018', serviceAreas: ['Heathrow', 'Gatwick', 'Central London'], vehicleTypes: ['Luxury', 'Mercedes E-Class', 'BMW 5 Series'] },
  capital: { id: 'capital', name: 'Capital Cars', rating: 4.8, completed: 1502, acceptance: 96.3, onTime: 97.2, fleet: 'Saloon', memberSince: '2017', serviceAreas: ['Luton', 'Stansted', 'Cambridge'], vehicleTypes: ['Business Saloon', 'Estate'] },
  border: { id: 'border', name: 'Border Executive', rating: 4.9, completed: 421, acceptance: 98.8, onTime: 98.5, fleet: 'Executive EV', memberSince: '2020', serviceAreas: ['Glasgow', 'Edinburgh', 'Stirling'], vehicleTypes: ['Executive EV', 'Luxury MPV'] },
}

export const OPERATOR_IDS = Object.keys(OPERATORS)

export const VEHICLES = [
  'Executive EV',
  'Tesla Model Y',
  'Mercedes E-Class',
  'Luxury MPV',
  '8-Seat MPV',
  'Business Saloon',
  'Estate',
  'BMW 5 Series',
]

/* ------------------------- journey generation ----------------------- */

interface RegionSeed {
  id: string
  name: string
  code: string
  center: [number, number]
  dests: string[]
}

const REGION_SEEDS: RegionSeed[] = [
  {
    id: 'manchester',
    name: 'Manchester Airport',
    code: 'MAN',
    center: [53.365, -2.272],
    dests: ['Blackpool', 'Bolton', 'Preston', 'Liverpool', 'Leeds', 'Sheffield', 'Stoke-on-Trent', 'Buxton', 'Wigan', 'Macclesfield', 'Warrington', 'Chester'],
  },
  {
    id: 'liverpool',
    name: 'Liverpool Airport',
    code: 'LPL',
    center: [53.336, -2.85],
    dests: ['Preston', 'Southport', 'Chester', 'Wigan', 'Warrington', 'Manchester'],
  },
  {
    id: 'leeds-bradford',
    name: 'Leeds Bradford Airport',
    code: 'LBA',
    center: [53.866, -1.66],
    dests: ['Harrogate', 'York', 'Bradford', 'Wakefield', 'Skipton', 'Sheffield'],
  },
  {
    id: 'birmingham',
    name: 'Birmingham Airport',
    code: 'BHX',
    center: [52.454, -1.748],
    dests: ['Coventry', 'Wolverhampton', 'Worcester', 'Leicester', 'Solihull', 'Stratford-upon-Avon'],
  },
  {
    id: 'heathrow',
    name: 'Heathrow Airport',
    code: 'LHR',
    center: [51.47, -0.454],
    dests: ['Reading', 'Slough', 'Watford', 'Guildford', 'Central London', 'Oxford'],
  },
  {
    id: 'gatwick',
    name: 'Gatwick Airport',
    code: 'LGW',
    center: [51.153, -0.182],
    dests: ['Brighton', 'Crawley', 'Croydon', 'Horsham', 'Eastbourne', 'Tunbridge Wells'],
  },
  {
    id: 'luton',
    name: 'Luton Airport',
    code: 'LTN',
    center: [51.875, -0.368],
    dests: ['St Albans', 'Milton Keynes', 'Bedford', 'Hemel Hempstead', 'Stevenage'],
  },
  {
    id: 'stansted',
    name: 'Stansted Airport',
    code: 'STN',
    center: [51.885, 0.235],
    dests: ['Cambridge', 'Chelmsford', 'Colchester', 'Bishops Stortford', 'Harlow'],
  },
  {
    id: 'glasgow',
    name: 'Glasgow Airport',
    code: 'GLA',
    center: [55.872, -4.433],
    dests: ['Edinburgh', 'Stirling', 'Paisley', 'Loch Lomond', 'Ayr'],
  },
  {
    id: 'edinburgh',
    name: 'Edinburgh Airport',
    code: 'EDI',
    center: [55.95, -3.372],
    dests: ['Glasgow', 'St Andrews', 'Stirling', 'Dunfermline', 'Livingston'],
  },
]

// Deterministic status mix so each region feels operationally busy.
const STATUS_CYCLE: JourneyStatus[] = [
  'available',
  'empty-return',
  'available',
  'cover-needed',
  'available',
  'empty-return',
  'urgent',
  'available',
]

const pad = (n: number) => n.toString().padStart(2, '0')

function offset(center: [number, number], i: number): [number, number] {
  const dLat = ((i * 47) % 100 - 50) / 900
  const dLng = ((i * 83) % 100 - 50) / 700
  return [center[0] + dLat, center[1] + dLng]
}

function buildRegion(seed: RegionSeed): Region {
  const journeys: Journey[] = seed.dests.map((dest, i) => {
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length]
    const seedChar = seed.code.charCodeAt(0)
    const value = 60 + ((i * 37 + seedChar * 3 + dest.length * 7 + dest.charCodeAt(0)) % 26) * 10
    const passengers = 1 + ((i * 3 + dest.length) % 6)
    const luggage = (i * 2 + 1 + dest.length) % 7
    const vehicle = VEHICLES[(i + seedChar) % VEHICLES.length]
    const operatorId = OPERATOR_IDS[(i * 2 + seedChar) % OPERATOR_IDS.length]
    const hour = 6 + ((i * 5 + seed.code.length) % 16)
    const minute = (i * 17) % 60
    const [lat, lng] = offset(seed.center, i)

    const journey: Journey = {
      id: `${seed.id}-${i + 1}`,
      regionId: seed.id,
      fromCode: seed.code,
      fromName: seed.name,
      to: dest,
      value,
      vehicle,
      passengers,
      luggage,
      pickup: `Today ${pad(hour)}:${pad(minute)}`,
      posted: `${1 + ((i * 9 + seed.code.length) % 57)} mins ago`,
      status,
      operatorId,
      lat,
      lng,
    }

    if (status === 'empty-return') journey.seats = 2 + (i % 3)
    if (status === 'cover-needed') journey.responseMins = 15 + ((i * 5) % 30)
    if (status === 'urgent') journey.responseMins = 8 + ((i * 3) % 18)

    return journey
  })

  return {
    id: seed.id,
    name: seed.name,
    code: seed.code,
    center: seed.center,
    journeys,
  }
}

export const REGIONS: Region[] = REGION_SEEDS.map(buildRegion)

/* ------------------------------ helpers ----------------------------- */

export function regionMetrics(region: Region): RegionMetrics {
  return {
    opportunities: region.journeys.length,
    revenue: region.journeys.reduce((sum, j) => sum + j.value, 0),
    emptyReturns: region.journeys.filter((j) => j.status === 'empty-return').length,
    coverRequests: region.journeys.filter(
      (j) => j.status === 'cover-needed' || j.status === 'urgent'
    ).length,
  }
}

export function marketplaceTotals(regions: Region[]): RegionMetrics {
  return regions.reduce<RegionMetrics>(
    (acc, region) => {
      const m = regionMetrics(region)
      acc.opportunities += m.opportunities
      acc.revenue += m.revenue
      acc.emptyReturns += m.emptyReturns
      acc.coverRequests += m.coverRequests
      return acc
    },
    { opportunities: 0, revenue: 0, emptyReturns: 0, coverRequests: 0 }
  )
}

export function formatGBP(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

/* --------------------------- dashboard data ------------------------- */
/*  Operator-facing dispatch metrics (replaces recruitment metrics).   */

export interface DashboardMetric {
  label: string
  value: string
  sub?: string
}

export const DASHBOARD_METRICS: DashboardMetric[] = [
  { label: 'Revenue Recovered', value: '£4,260', sub: 'last 30 days' },
  { label: 'Dead Miles Eliminated', value: '1,142 mi', sub: 'last 30 days' },
  { label: 'Journeys Completed', value: '318', sub: 'all time' },
  { label: 'Cover Requests Fulfilled', value: '47', sub: 'this quarter' },
  { label: 'Operator Rating', value: '4.9', sub: 'top 5% network' },
  { label: 'Marketplace Earnings', value: '£12,880', sub: 'this year' },
]

/* ----------------------- live marketplace activity ------------------ */
/*  Pre-built feed of recent dispatch events for the live ticker.      */

export interface ActivityEvent {
  operator: string
  verb: string
  code: string
  to: string
  value: string
}

/* ---------------------- recently claimed journeys ------------------- */

export interface RecentClaim {
  id: string
  fromCode: string
  to: string
  value: number
  operatorId: string
  ago: string
}

export function buildRecentClaims(regions: Region[]): RecentClaim[] {
  const agos = ['just now', '2m ago', '5m ago', '11m ago', '18m ago', '26m ago', '38m ago', '54m ago']
  const claims: RecentClaim[] = []
  let i = 0
  regions.forEach((region) => {
    region.journeys.slice(0, 2).forEach((j) => {
      claims.push({
        id: `claim-${j.id}`,
        fromCode: region.code,
        to: j.to,
        value: j.value,
        operatorId: j.operatorId,
        ago: agos[i % agos.length],
      })
      i++
    })
  })
  return claims.slice(0, 8)
}

/* ----------------------- operator profile data ---------------------- */

export interface Review {
  id: string
  author: string
  role: string
  rating: number
  text: string
}

const REVIEW_POOL: { author: string; role: string; text: string }[] = [
  { author: 'Pennine Cars', role: 'Operator', text: 'Took a last-minute cover run for us at Manchester. Spotless car, on time, kept us updated the whole way.' },
  { author: 'A. Whitfield', role: 'Dispatch', text: 'Reliable on empty returns — we trade journeys with them weekly and have never had an issue.' },
  { author: 'Mersey Premier', role: 'Operator', text: 'Professional from booking to drop-off. Exactly the standard we expect when handing over a client.' },
  { author: 'J. Okafor', role: 'Fleet Manager', text: 'Accepted an urgent airport transfer within minutes. Saved us a very awkward call to the client.' },
  { author: 'Skyline Chauffeurs', role: 'Operator', text: 'Great comms and always punctual. Happy to pass executive work to them any day.' },
  { author: 'L. Hargreaves', role: 'Dispatch', text: 'Consistent five-star service. Our go-to when our own fleet is stretched.' },
]

export function buildReviews(operatorId: string): Review[] {
  const start = Math.max(0, OPERATOR_IDS.indexOf(operatorId))
  const ratings = [5, 5, 4.8]
  return ratings.map((rating, k) => {
    const r = REVIEW_POOL[(start + k) % REVIEW_POOL.length]
    return { id: `${operatorId}-rev-${k}`, author: r.author, role: r.role, rating, text: r.text }
  })
}

export function buildOperatorJourneys(regions: Region[], operatorId: string): RecentClaim[] {
  const agos = ['1h ago', '3h ago', 'yesterday', '2 days ago', '3 days ago']
  const out: RecentClaim[] = []
  let i = 0
  regions.forEach((r) => {
    r.journeys.forEach((j) => {
      if (j.operatorId === operatorId && out.length < 5) {
        out.push({
          id: `done-${j.id}`,
          fromCode: r.code,
          to: j.to,
          value: j.value,
          operatorId,
          ago: agos[i % agos.length],
        })
        i++
      }
    })
  })
  return out
}

export function buildActivity(regions: Region[]): ActivityEvent[] {
  const verbs = ['claimed', 'covered', 'matched', 'broadcast', 'posted']
  const events: ActivityEvent[] = []
  regions.forEach((region, ri) => {
    region.journeys.slice(0, 3).forEach((j, i) => {
      const op = OPERATORS[j.operatorId]
      events.push({
        operator: op.name,
        verb: verbs[(ri + i) % verbs.length],
        code: region.code,
        to: j.to,
        value: formatGBP(j.value),
      })
    })
  })
  return events
}

/* ------------------------------- fetch ------------------------------ */
/*  Live data hook: pull regions from your backend, fall back to mock. */

export async function fetchRegions(): Promise<Region[]> {
  const url = import.meta.env.VITE_MARKETPLACE_API_URL
  if (!url) return REGIONS

  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const key = import.meta.env.VITE_MARKETPLACE_API_KEY
    if (key) headers.Authorization = `Bearer ${key}`

    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Marketplace API responded ${res.status}`)

    const data = await res.json()
    const regions = Array.isArray(data) ? data : data?.regions ?? data?.data
    return Array.isArray(regions) && regions.length ? (regions as Region[]) : REGIONS
  } catch (err) {
    console.warn('[marketplace] using sample data — live fetch failed:', err)
    return REGIONS
  }
}
