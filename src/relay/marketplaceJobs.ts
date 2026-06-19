import { useMemo } from 'react'
import { REGIONS, OPERATORS, formatGBP, type JourneyStatus } from '../data/marketplace'

// -----------------------------------------------------------------------------
// Marketplace job dataset for the interactive map.
//
// Derived deterministically from the real region/journey catalogue, fanned out
// into many geo-located opportunities so the map has enough density to cluster
// meaningfully (Uber Driver / FlightRadar feel). Each job carries pickup +
// dropoff coordinates, a category, value, and profitability (£/mile) so the
// map and drawer can rank "most profitable nearby work" instantly.
// -----------------------------------------------------------------------------

export type JobCategory = 'airport' | 'empty-return' | 'cover' | 'urgent'

export interface MarketJob {
  id: string
  category: JobCategory
  fromCode: string
  fromName: string
  toName: string
  pickup: [number, number] // [lng, lat]
  dropoff: [number, number] // [lng, lat]
  value: number
  miles: number
  perMile: number
  operatorId: string
  operatorName: string
  vehicle: string
  passengers: number
  postedMins: number
}

export const CATEGORY_META: Record<JobCategory, { label: string; short: string; color: string }> = {
  airport: { label: 'Airport Transfer', short: 'Airport', color: '#06B6D4' },
  'empty-return': { label: 'Empty Return', short: 'Empty Return', color: '#8B5CF6' },
  cover: { label: 'Cover Request', short: 'Cover', color: '#F59E0B' },
  urgent: { label: 'Urgent', short: 'Urgent', color: '#EF4444' },
}

const CATEGORY_FROM_STATUS: Record<JourneyStatus, JobCategory> = {
  available: 'airport',
  'empty-return': 'empty-return',
  'cover-needed': 'cover',
  urgent: 'urgent',
}

// Approximate coordinates [lat, lng] for the destination towns/cities used by
// the region catalogue — gives credible route lines instead of random vectors.
const CITY_COORDS: Record<string, [number, number]> = {
  Blackpool: [53.817, -3.035], Bolton: [53.578, -2.429], Preston: [53.763, -2.703],
  Liverpool: [53.408, -2.991], Leeds: [53.801, -1.549], Sheffield: [53.381, -1.47],
  'Stoke-on-Trent': [53.002, -2.179], Buxton: [53.259, -1.911], Wigan: [53.545, -2.631],
  Macclesfield: [53.261, -2.125], Warrington: [53.39, -2.597], Chester: [53.19, -2.892],
  Southport: [53.648, -3.007], Manchester: [53.481, -2.242], Harrogate: [53.992, -1.541],
  York: [53.961, -1.074], Bradford: [53.795, -1.759], Wakefield: [53.683, -1.499],
  Skipton: [53.962, -2.016], Coventry: [52.406, -1.519], Wolverhampton: [52.587, -2.128],
  Worcester: [52.192, -2.22], Leicester: [52.637, -1.139], Solihull: [52.412, -1.778],
  'Stratford-upon-Avon': [52.192, -1.707], Reading: [51.454, -0.978], Slough: [51.511, -0.591],
  Watford: [51.656, -0.396], Guildford: [51.236, -0.571], 'Central London': [51.509, -0.128],
  Oxford: [51.752, -1.258], Brighton: [50.822, -0.137], Crawley: [51.112, -0.187],
  Croydon: [51.376, -0.099], Horsham: [51.064, -0.327], Eastbourne: [50.768, 0.29],
  'Tunbridge Wells': [51.132, 0.263], 'St Albans': [51.755, -0.336], 'Milton Keynes': [52.04, -0.759],
  Bedford: [52.136, -0.467], 'Hemel Hempstead': [51.754, -0.449], Stevenage: [51.902, -0.202],
  Cambridge: [52.205, 0.119], Chelmsford: [51.736, 0.469], Colchester: [51.889, 0.903],
  'Bishops Stortford': [51.871, 0.159], Harlow: [51.768, 0.091], Edinburgh: [55.953, -3.188],
  Stirling: [56.116, -3.937], Paisley: [55.846, -4.424], 'Loch Lomond': [56.09, -4.62],
  Ayr: [55.458, -4.629], Glasgow: [55.864, -4.252], 'St Andrews': [56.34, -2.795],
  Dunfermline: [56.072, -3.452], Livingston: [55.883, -3.523],
}

function dropoffFor(name: string, pickup: [number, number], seed: number): [number, number] {
  const c = CITY_COORDS[name]
  if (c) return [c[1], c[0]]
  // Synthesize a plausible nearby destination if we don't know the town.
  const ang = (seed * 53) % 360
  const dist = 0.18 + ((seed * 7) % 20) / 100
  return [pickup[0] + Math.cos((ang * Math.PI) / 180) * dist, pickup[1] + Math.sin((ang * Math.PI) / 180) * dist]
}

function haversineMiles(a: [number, number], b: [number, number]): number {
  const R = 3958.8
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const lat1 = (a[1] * Math.PI) / 180
  const lat2 = (b[1] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.max(1, Math.round(2 * R * Math.asin(Math.sqrt(h))))
}

function parsePostedMins(posted: string): number {
  const m = posted.match(/(\d+)/)
  return m ? Number(m[1]) : 30
}

// Fan each catalogue journey into a few jittered, geo-located opportunities.
const COPIES = 7

function build(): MarketJob[] {
  const jobs: MarketJob[] = []
  REGIONS.forEach((region) => {
    region.journeys.forEach((j) => {
      const op = OPERATORS[j.operatorId]
      const baseCat = CATEGORY_FROM_STATUS[j.status]
      for (let k = 0; k < COPIES; k++) {
        const s = j.lat * 1000 + j.lng * 1000 + k * 13 + region.code.charCodeAt(0)
        const seed = Math.abs(Math.round(s))
        const jLat = j.lat + (((seed * 31) % 100) - 50) / 1300
        const jLng = j.lng + (((seed * 17) % 100) - 50) / 900
        const pickup: [number, number] = [jLng, jLat]
        const dropoff = dropoffFor(j.to, pickup, seed)
        const miles = haversineMiles(pickup, dropoff)
        const value = Math.max(35, j.value + (((seed * 7) % 60) - 25))
        // Occasionally promote a copy to urgent so urgency is sprinkled across the map.
        const category: JobCategory = baseCat === 'airport' && seed % 11 === 0 ? 'urgent' : baseCat
        jobs.push({
          id: `${j.id}-v${k}`,
          category,
          fromCode: region.code,
          fromName: region.name,
          toName: j.to,
          pickup,
          dropoff,
          value,
          miles,
          perMile: Math.round((value / miles) * 100) / 100,
          operatorId: j.operatorId,
          operatorName: op?.name ?? 'Operator',
          vehicle: j.vehicle,
          passengers: j.passengers,
          postedMins: parsePostedMins(j.posted) + k * 3,
        })
      }
    })
  })
  return jobs
}

const ALL_JOBS = build()

export function jobsGeoJSON(jobs: MarketJob[]) {
  return {
    type: 'FeatureCollection' as const,
    features: jobs.map((j) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: j.pickup },
      properties: { id: j.id, category: j.category, value: j.value },
    })),
  }
}

export function useMarketJobs(): MarketJob[] {
  return useMemo(() => ALL_JOBS, [])
}

export function categoryCounts(jobs: MarketJob[]): Record<JobCategory, number> {
  const out: Record<JobCategory, number> = { airport: 0, 'empty-return': 0, cover: 0, urgent: 0 }
  for (const j of jobs) out[j.category]++
  return out
}

export { formatGBP }
