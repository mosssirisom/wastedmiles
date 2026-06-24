export * from './marketplace'

import { REGIONS, type Region } from './marketplace'
import { isSupabaseConfigured } from '../lib/supabase'
import { listMarketplaceRegions } from '../lib/marketplaceService'

export async function fetchRegions(): Promise<Region[]> {
  if (isSupabaseConfigured) {
    try {
      const regions = await listMarketplaceRegions()
      if (regions.length) return regions
    } catch (error) {
      console.warn('[marketplace] using sample data — Supabase fetch failed:', error)
    }
  }

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
  } catch (error) {
    console.warn('[marketplace] using sample data — legacy live fetch failed:', error)
    return REGIONS
  }
}
