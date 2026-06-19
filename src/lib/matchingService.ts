import { supabase } from './supabase'
import type { Database } from './supabase.types'

type JourneyRow = Database['public']['Tables']['journeys']['Row']

export interface MatchCandidate {
  outbound: JourneyRow
  returnLeg: JourneyRow
  score: number
  reason: string
}

function normaliseTown(value?: string | null) {
  return (value || '').trim().toLowerCase()
}

function minutesBetween(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000
}

function scorePair(outbound: JourneyRow, returnLeg: JourneyRow) {
  let score = 0
  const reasons: string[] = []

  if (normaliseTown(outbound.dropoff_town) && normaliseTown(outbound.dropoff_town) === normaliseTown(returnLeg.pickup_town)) {
    score += 45
    reasons.push('pickup starts where the first journey ends')
  }

  if (normaliseTown(outbound.pickup_town) && normaliseTown(outbound.pickup_town) === normaliseTown(returnLeg.dropoff_town)) {
    score += 35
    reasons.push('return leg heads back toward base route')
  }

  const gapMinutes = minutesBetween(outbound.pickup_time, returnLeg.pickup_time)
  if (gapMinutes <= 180) {
    score += 20
    reasons.push('timings are close enough to recover the empty mileage')
  } else if (gapMinutes <= 360) {
    score += 10
    reasons.push('timings may still work with dispatch adjustment')
  }

  return { score, reason: reasons.join('; ') || 'possible operational fit' }
}

export async function findEmptyLegMatches(operatorId: string, limit = 10): Promise<MatchCandidate[]> {
  if (!supabase) return []

  const { data: ownJourneys, error: ownError } = await supabase
    .from('journeys')
    .select('*')
    .eq('posting_operator_id', operatorId)
    .in('status', ['available', 'claimed', 'matched'])
    .gte('pickup_time', new Date().toISOString())
    .order('pickup_time', { ascending: true })

  if (ownError) throw ownError

  const { data: marketplaceReturns, error: marketError } = await supabase
    .from('journeys')
    .select('*')
    .eq('kind', 'empty_return')
    .in('status', ['available', 'empty_return'])
    .neq('posting_operator_id', operatorId)
    .gte('pickup_time', new Date().toISOString())
    .order('pickup_time', { ascending: true })

  if (marketError) throw marketError

  const candidates: MatchCandidate[] = []

  for (const outbound of ownJourneys ?? []) {
    for (const returnLeg of marketplaceReturns ?? []) {
      const result = scorePair(outbound, returnLeg)
      if (result.score >= 45) {
        candidates.push({ outbound, returnLeg, score: result.score, reason: result.reason })
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit)
}
