export interface Job {
  id: string
  title: string
  type: string
  pay: string
  posted: string
  lat: number
  lng: number
}

export interface Town {
  id: string
  name: string
  center: [number, number]
  jobs: Job[]
}

/* ------------------------------------------------------------------ */
/*  Live data: fetch jobs from your own backend.                       */
/*                                                                     */
/*  Configure the endpoint via env vars (see .env.example):            */
/*    VITE_JOBS_API_URL  – your backend endpoint returning JSON        */
/*    VITE_JOBS_API_KEY  – optional; sent as `Authorization: Bearer`   */
/*                                                                     */
/*  The adapter accepts EITHER of these JSON shapes:                   */
/*                                                                     */
/*  A) Grouped by town (preferred):                                    */
/*  [                                                                  */
/*    { "id": "barrow", "name": "Barrow-in-Furness",                   */
/*      "center": [54.111, -3.227],                                    */
/*      "jobs": [                                                      */
/*        { "id": "bar-1", "title": "Site Geologist",                  */
/*          "type": "Contract", "pay": "£280/day", "posted": "2d ago", */
/*          "lat": 54.115, "lng": -3.22 }                              */
/*      ] }                                                            */
/*  ]                                                                  */
/*                                                                     */
/*  B) Flat list of jobs (grouped automatically by `town`/`area`):     */
/*  [                                                                  */
/*    { "id": "bar-1", "title": "Site Geologist", "town": "Barrow",    */
/*      "type": "Contract", "pay": "£280/day", "posted": "2d ago",     */
/*      "lat": 54.115, "lng": -3.22 }                                  */
/*  ]                                                                  */
/*                                                                     */
/*  If your backend returns a different shape, tell me and I'll adjust */
/*  the adapter functions below — the components never need to change. */
/* ------------------------------------------------------------------ */

export async function fetchTowns(): Promise<Town[]> {
  const url = import.meta.env.VITE_JOBS_API_URL
  if (!url) return MOCK_TOWNS

  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const key = import.meta.env.VITE_JOBS_API_KEY
    if (key) headers.Authorization = `Bearer ${key}`

    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Jobs API responded ${res.status}`)

    const towns = adaptTowns(await res.json())
    return towns.length ? towns : MOCK_TOWNS
  } catch (err) {
    console.warn('[jobs] using sample data — live fetch failed:', err)
    return MOCK_TOWNS
  }
}

/* ----------------------------- adapters ---------------------------- */

function adaptTowns(raw: unknown): Town[] {
  const arr = Array.isArray(raw)
    ? raw
    : (raw as { towns?: unknown[]; data?: unknown[] })?.towns ??
      (raw as { data?: unknown[] })?.data ??
      []
  if (!Array.isArray(arr) || arr.length === 0) return []

  // Shape A: items already contain a `jobs` array.
  if (arr[0] && Array.isArray((arr[0] as { jobs?: unknown }).jobs)) {
    return arr
      .map((t) => normalizeTown(t as Record<string, unknown>))
      .filter((t): t is Town => t !== null)
  }

  // Shape B: a flat list of jobs — group by town/area.
  return groupJobs(arr as Record<string, unknown>[])
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v)
}

function toCenter(t: Record<string, unknown>): [number, number] | null {
  if (Array.isArray(t.center) && t.center.length === 2) {
    const a = num(t.center[0])
    const b = num(t.center[1])
    if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b]
  }
  const lat = num(t.lat ?? t.latitude)
  const lng = num(t.lng ?? t.lon ?? t.longitude)
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng]
  return null
}

function normalizeJob(j: Record<string, unknown>): Job | null {
  const lat = num(j.lat ?? j.latitude)
  const lng = num(j.lng ?? j.lon ?? j.longitude)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return {
    id: String(j.id ?? `${lat},${lng}`),
    title: String(j.title ?? j.role ?? 'Untitled role'),
    type: String(j.type ?? j.employmentType ?? 'Full-time'),
    pay: String(j.pay ?? j.salary ?? ''),
    posted: String(j.posted ?? j.postedAt ?? ''),
    lat,
    lng,
  }
}

function normalizeTown(t: Record<string, unknown>): Town | null {
  const jobs = Array.isArray(t.jobs)
    ? (t.jobs as Record<string, unknown>[])
        .map(normalizeJob)
        .filter((j): j is Job => j !== null)
    : []
  const center = toCenter(t) ?? (jobs.length ? avgCenter(jobs) : null)
  if (!center) return null
  return {
    id: String(t.id ?? t.name ?? 'area'),
    name: String(t.name ?? t.id ?? 'Area'),
    center,
    jobs,
  }
}

function groupJobs(rawJobs: Record<string, unknown>[]): Town[] {
  const groups = new Map<string, Job[]>()
  for (const rj of rawJobs) {
    const job = normalizeJob(rj)
    if (!job) continue
    const name = String(rj.town ?? rj.area ?? rj.location ?? 'Other')
    const list = groups.get(name) ?? []
    list.push(job)
    groups.set(name, list)
  }
  return Array.from(groups.entries()).map(([name, jobs]) => ({
    id: slug(name),
    name,
    center: avgCenter(jobs),
    jobs,
  }))
}

function avgCenter(jobs: Job[]): [number, number] {
  const lat = jobs.reduce((s, j) => s + j.lat, 0) / jobs.length
  const lng = jobs.reduce((s, j) => s + j.lng, 0) / jobs.length
  return [lat, lng]
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/* --------------------------- sample data --------------------------- */
/*  Used until VITE_JOBS_API_URL is set, and as a fallback on error.   */

export const MOCK_TOWNS: Town[] = [
  {
    id: 'barrow',
    name: 'Barrow-in-Furness',
    center: [54.111, -3.227],
    jobs: [
      { id: 'bar-1', title: 'Site Geologist', type: 'Contract', pay: '£280/day', posted: '2d ago', lat: 54.115, lng: -3.22 },
      { id: 'bar-2', title: 'Geotechnical Technician', type: 'Full-time', pay: '£32k', posted: '4d ago', lat: 54.108, lng: -3.235 },
      { id: 'bar-3', title: 'Borehole Logger', type: 'Contract', pay: '£180/day', posted: '1d ago', lat: 54.118, lng: -3.21 },
      { id: 'bar-4', title: 'Coastal Survey Technician', type: 'Part-time', pay: '£18/hr', posted: '6d ago', lat: 54.10, lng: -3.24 },
    ],
  },
  {
    id: 'blackpool',
    name: 'Blackpool',
    center: [53.817, -3.035],
    jobs: [
      { id: 'bla-1', title: 'Ground Investigation Lead', type: 'Full-time', pay: '£42k', posted: '3d ago', lat: 53.82, lng: -3.05 },
      { id: 'bla-2', title: 'Drilling Assistant', type: 'Contract', pay: '£160/day', posted: '1d ago', lat: 53.81, lng: -3.02 },
      { id: 'bla-3', title: 'Environmental Scientist', type: 'Full-time', pay: '£35k', posted: '5d ago', lat: 53.825, lng: -3.04 },
      { id: 'bla-4', title: 'Soil Sampling Technician', type: 'Part-time', pay: '£19/hr', posted: '2d ago', lat: 53.812, lng: -3.05 },
    ],
  },
  {
    id: 'manchester-airport',
    name: 'Manchester Airport',
    center: [53.365, -2.272],
    jobs: [
      { id: 'man-1', title: 'Geotechnical Engineer', type: 'Full-time', pay: '£48k', posted: '1d ago', lat: 53.367, lng: -2.27 },
      { id: 'man-2', title: 'Site Investigation Geologist', type: 'Contract', pay: '£300/day', posted: '3d ago', lat: 53.36, lng: -2.28 },
      { id: 'man-3', title: 'GIS Technician', type: 'Full-time', pay: '£30k', posted: '4d ago', lat: 53.37, lng: -2.265 },
      { id: 'man-4', title: 'Materials Lab Technician', type: 'Full-time', pay: '£27k', posted: '6d ago', lat: 53.362, lng: -2.26 },
    ],
  },
  {
    id: 'lancaster',
    name: 'Lancaster',
    center: [54.047, -2.801],
    jobs: [
      { id: 'lan-1', title: 'Field Survey Technician', type: 'Full-time', pay: '£29k', posted: '2d ago', lat: 54.05, lng: -2.80 },
      { id: 'lan-2', title: 'Hydrogeologist', type: 'Contract', pay: '£320/day', posted: '1d ago', lat: 54.043, lng: -2.81 },
      { id: 'lan-3', title: 'Drilling Supervisor', type: 'Full-time', pay: '£40k', posted: '5d ago', lat: 54.052, lng: -2.79 },
    ],
  },
  {
    id: 'preston',
    name: 'Preston',
    center: [53.759, -2.699],
    jobs: [
      { id: 'pre-1', title: 'Geo-Environmental Consultant', type: 'Full-time', pay: '£38k', posted: '3d ago', lat: 53.76, lng: -2.70 },
      { id: 'pre-2', title: 'Borehole Logger', type: 'Contract', pay: '£185/day', posted: '2d ago', lat: 53.755, lng: -2.69 },
      { id: 'pre-3', title: 'CAD / GIS Technician', type: 'Full-time', pay: '£28k', posted: '4d ago', lat: 53.763, lng: -2.705 },
    ],
  },
  {
    id: 'liverpool',
    name: 'Liverpool',
    center: [53.408, -2.991],
    jobs: [
      { id: 'liv-1', title: 'Senior Geotechnical Engineer', type: 'Full-time', pay: '£55k', posted: '1d ago', lat: 53.41, lng: -2.99 },
      { id: 'liv-2', title: 'Site Geologist', type: 'Contract', pay: '£290/day', posted: '2d ago', lat: 53.405, lng: -2.98 },
      { id: 'liv-3', title: 'Contaminated Land Scientist', type: 'Full-time', pay: '£36k', posted: '5d ago', lat: 53.412, lng: -3.00 },
      { id: 'liv-4', title: 'Marine Survey Technician', type: 'Contract', pay: '£210/day', posted: '3d ago', lat: 53.40, lng: -2.995 },
    ],
  },
  {
    id: 'carlisle',
    name: 'Carlisle',
    center: [54.892, -2.932],
    jobs: [
      { id: 'car-1', title: 'Quarry Geologist', type: 'Full-time', pay: '£41k', posted: '4d ago', lat: 54.895, lng: -2.93 },
      { id: 'car-2', title: 'Ground Investigation Technician', type: 'Contract', pay: '£170/day', posted: '1d ago', lat: 54.888, lng: -2.94 },
      { id: 'car-3', title: 'Environmental Field Scientist', type: 'Full-time', pay: '£33k', posted: '6d ago', lat: 54.896, lng: -2.925 },
    ],
  },
  {
    id: 'kendal',
    name: 'Kendal',
    center: [54.328, -2.745],
    jobs: [
      { id: 'ken-1', title: 'Engineering Geologist', type: 'Full-time', pay: '£39k', posted: '2d ago', lat: 54.33, lng: -2.745 },
      { id: 'ken-2', title: 'Slope Stability Technician', type: 'Contract', pay: '£230/day', posted: '3d ago', lat: 54.325, lng: -2.75 },
      { id: 'ken-3', title: 'Field Sampling Assistant', type: 'Part-time', pay: '£18/hr', posted: '5d ago', lat: 54.331, lng: -2.74 },
    ],
  },
]
