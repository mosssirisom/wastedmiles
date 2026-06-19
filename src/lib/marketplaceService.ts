import { supabase } from './supabase'
import type { Database } from './supabase.types'
import type { Journey, JourneyStatus, Operator, Region } from '../data/marketplace'

type AirportRow = Database['public']['Tables']['airports']['Row']
type OperatorRow = Database['public']['Tables']['operators']['Row']
type JourneyRow = Database['public']['Tables']['journeys']['Row']
type MarketplaceJourneyRow = Database['public']['Views']['available_marketplace_journeys']['Row']

export interface CreateOperatorInput {
  ownerUserId: string
  name: string
  email?: string
  phone?: string
  website?: string
  baseTown?: string
  basePostcode?: string
  serviceAreas?: string[]
  vehicleTypes?: string[]
  fleetSummary?: string
}

export interface PostJourneyInput {
  postingOperatorId: string
  airportId?: string
  kind: 'standard' | 'empty_return' | 'cover_request'
  pickupAddress: string
  pickupTown?: string
  pickupPostcode?: string
  dropoffAddress: string
  dropoffTown?: string
  dropoffPostcode?: string
  pickupTime: string
  flightNumber?: string
  passengerCount: number
  luggageCount: number
  seatsAvailable?: number
  vehicleType: string
  priceGbp: number
  notes?: string
  latitude?: number
  longitude?: number
  responseDeadline?: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toUiStatus(status: JourneyRow['status']): JourneyStatus {
  if (status === 'empty_return') return 'empty-return'
  if (status === 'cover_needed') return 'cover-needed'
  if (status === 'urgent') return 'urgent'
  return 'available'
}

function toOperator(row: OperatorRow): Operator {
  return {
    id: row.id,
    name: row.name,
    rating: Number(row.rating),
    completed: row.completed_journeys,
    acceptance: Number(row.acceptance_rate),
    onTime: Number(row.on_time_rate),
    fleet: row.fleet_summary || row.vehicle_types.join(', ') || 'Operator fleet',
    memberSince: new Date(row.created_at).getFullYear().toString(),
    serviceAreas: row.service_areas,
    vehicleTypes: row.vehicle_types,
  }
}

function timeUntilPickup(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now()
  const mins = Math.round(diffMs / 60000)
  if (mins < 60) return mins <= 0 ? 'Now' : `In ${mins} mins`
  const hours = Math.round(mins / 60)
  return hours < 24 ? `In ${hours}h` : new Date(iso).toLocaleDateString('en-GB')
}

function timeSince(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} mins ago`
  const hours = Math.round(mins / 60)
  return hours < 24 ? `${hours}h ago` : new Date(iso).toLocaleDateString('en-GB')
}

function toJourney(row: MarketplaceJourneyRow): Journey {
  const pickupName = row.airport_name || row.pickup_town || row.pickup_address
  const destination = row.dropoff_town || row.dropoff_address
  return {
    id: row.id,
    regionId: row.airport_id || 'other',
    fromCode: row.airport_code || 'WM',
    fromName: pickupName,
    to: destination,
    value: Number(row.price_gbp),
    vehicle: row.vehicle_type,
    passengers: row.passenger_count,
    luggage: row.luggage_count,
    pickup: timeUntilPickup(row.pickup_time),
    posted: timeSince(row.created_at),
    status: toUiStatus(row.status),
    operatorId: row.posting_operator_id,
    lat: Number(row.latitude || 53.365),
    lng: Number(row.longitude || -2.272),
    seats: row.seats_available ?? undefined,
    responseMins: row.response_deadline
      ? Math.max(0, Math.round((new Date(row.response_deadline).getTime() - Date.now()) / 60000))
      : undefined,
  }
}

function groupRegions(airports: AirportRow[], journeys: Journey[]): Region[] {
  return airports.map((airport) => ({
    id: airport.id,
    name: airport.name,
    code: airport.code,
    center: [Number(airport.latitude), Number(airport.longitude)],
    journeys: journeys.filter((journey) => journey.regionId === airport.id),
  }))
}

export async function listOperators(): Promise<Record<string, Operator>> {
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('operators')
    .select('*')
    .eq('status', 'verified')
    .order('rating', { ascending: false })

  if (error) throw error
  return Object.fromEntries((data ?? []).map((row) => [row.id, toOperator(row)]))
}

export async function createOperator(input: CreateOperatorInput) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data: operator, error } = await supabase
    .from('operators')
    .insert({
      owner_user_id: input.ownerUserId,
      name: input.name,
      slug: slugify(input.name),
      email: input.email,
      phone: input.phone,
      website: input.website,
      base_town: input.baseTown,
      base_postcode: input.basePostcode,
      service_areas: input.serviceAreas ?? [],
      vehicle_types: input.vehicleTypes ?? [],
      fleet_summary: input.fleetSummary,
    })
    .select('*')
    .single()

  if (error) throw error

  const { error: memberError } = await supabase.from('operator_members').insert({
    operator_id: operator.id,
    user_id: input.ownerUserId,
    role: 'owner',
  })

  if (memberError) throw memberError
  return operator
}

export async function listMarketplaceRegions(): Promise<Region[]> {
  if (!supabase) return []

  const [{ data: airports, error: airportError }, { data: journeys, error: journeyError }] = await Promise.all([
    supabase.from('airports').select('*').eq('active', true).order('name'),
    supabase
      .from('available_marketplace_journeys')
      .select('*')
      .order('pickup_time', { ascending: true }),
  ])

  if (airportError) throw airportError
  if (journeyError) throw journeyError

  return groupRegions(airports ?? [], (journeys ?? []).map(toJourney))
}

export async function postJourney(input: PostJourneyInput) {
  if (!supabase) throw new Error('Supabase is not configured')

  const status = input.kind === 'empty_return' ? 'empty_return' : input.kind === 'cover_request' ? 'cover_needed' : 'available'

  const { data, error } = await supabase
    .from('journeys')
    .insert({
      posting_operator_id: input.postingOperatorId,
      airport_id: input.airportId,
      kind: input.kind,
      status,
      pickup_address: input.pickupAddress,
      pickup_town: input.pickupTown,
      pickup_postcode: input.pickupPostcode,
      dropoff_address: input.dropoffAddress,
      dropoff_town: input.dropoffTown,
      dropoff_postcode: input.dropoffPostcode,
      pickup_time: input.pickupTime,
      flight_number: input.flightNumber,
      passenger_count: input.passengerCount,
      luggage_count: input.luggageCount,
      seats_available: input.seatsAvailable,
      vehicle_type: input.vehicleType,
      price_gbp: input.priceGbp,
      notes: input.notes,
      latitude: input.latitude,
      longitude: input.longitude,
      response_deadline: input.responseDeadline,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function claimJourney(journeyId: string, claimingOperatorId: string, message?: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.rpc('claim_journey_atomic', {
    p_journey_id: journeyId,
    p_claiming_operator_id: claimingOperatorId,
    p_message: message ?? null,
  })

  if (error) throw error
  return data
}

export async function acceptJourneyClaim(claimId: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.rpc('accept_journey_claim', { p_claim_id: claimId })
  if (error) throw error
  return data
}

export async function completeJourney(journeyId: string) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.rpc('complete_journey', { p_journey_id: journeyId })
  if (error) throw error
  return data
}
