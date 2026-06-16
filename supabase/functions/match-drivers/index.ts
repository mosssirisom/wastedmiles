// Proximity dispatch: find drivers who can realistically make a job's pickup
// (travel time + mandatory buffer) and trigger targeted alerts.
//
// Deploy: supabase functions deploy match-drivers
// Invoke:  POST { "jobId": "<uuid>" }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUFFER_MINUTES = 30 // mandatory buffer before pickup
const AVG_SPEED_KMH = 60 // conservative road-speed estimate
const MAX_RANGE_KM = 160 // ignore drivers further than this
const URGENT_WINDOW_MIN = 180 // <3h to pickup => urgent, targeted push only

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function vehicleMatches(job: Record<string, unknown>, d: Record<string, unknown>) {
  const cap = Number(d.passenger_capacity ?? 0)
  if (cap < Number(job.passengers)) return false
  if (job.vehicle_category === 'large' && cap < 5) return false
  const sub = job.vehicle_subcategory as string | null
  if (sub) {
    const ds = d.vehicle_subcategory as string | null
    if (!ds) return false
    if (sub === 'estate') return ds === 'estate' || ds === 'minibus'
    if (sub === 'executive') return ds === 'executive' || ds === 'minibus'
    if (sub === 'minibus') return ds === 'minibus'
    if (sub === 'saloon') return ['saloon', 'estate', 'executive'].includes(ds)
  }
  return true
}

Deno.serve(async (req) => {
  try {
    const { jobId } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    if (jobErr || !job) return new Response('Job not found', { status: 404 })

    const minutesToPickup = (new Date(job.pickup_at).getTime() - Date.now()) / 60000
    const urgent = minutesToPickup <= URGENT_WINDOW_MIN

    // Verified drivers in the same licensing authority with a live location.
    const { data: drivers } = await supabase
      .from('profiles')
      .select(
        'id, vehicle_category, vehicle_subcategory, passenger_capacity, ' +
          'locations:locations!inner(lat, lng, updated_at)',
      )
      .eq('is_driver', true)
      .eq('driver_verified', true)
      .eq('licensing_authority', job.licensing_authority)

    const eligible = (drivers ?? [])
      .map((d) => {
        const loc = Array.isArray(d.locations) ? d.locations[0] : d.locations
        if (!loc) return null
        const distanceKm = haversineKm(loc.lat, loc.lng, job.pickup_lat, job.pickup_lng)
        const travelMin = (distanceKm / AVG_SPEED_KMH) * 60
        const canMakeIt = minutesToPickup >= travelMin + BUFFER_MINUTES
        if (distanceKm > MAX_RANGE_KM || !canMakeIt || !vehicleMatches(job, d)) return null
        return { driverId: d.id, distanceKm: Math.round(distanceKm), etaMin: Math.round(travelMin) }
      })
      .filter((x): x is { driverId: string; distanceKm: number; etaMin: number } => x !== null)
      .sort((a, b) => a.etaMin - b.etaMin)

    // TODO: dispatch push notifications to `eligible` driver ids
    //   - urgent  => high-priority targeted push (FCM/APNs/web-push)
    //   - else    => standard broadcast to the eligible set
    console.log(
      `[match] job ${jobId} urgent=${urgent} eligible=${eligible.length}`,
    )

    return new Response(JSON.stringify({ urgent, eligible }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(`error: ${err}`, { status: 500 })
  }
})
