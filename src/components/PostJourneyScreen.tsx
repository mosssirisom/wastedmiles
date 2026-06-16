import { useState } from 'react'
import { ArrowLeft, Plane } from 'lucide-react'
import { postJob } from '../lib/jobsStore'
import { toast } from '../lib/toast'
import type { Region } from '../data/marketplace'

interface PostJourneyScreenProps {
  regions: Region[]
  onBack: () => void
  onPosted: () => void
}

const labelClass = 'block text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA] mb-1.5'
const inputClass =
  'w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#F97316]/60'

function defaultPickup() {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  // format for <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function PostJourneyScreen({ regions, onBack, onPosted }: PostJourneyScreenProps) {
  const [airport, setAirport] = useState(regions[0]?.id ?? '')
  const [destination, setDestination] = useState('')
  const [passengers, setPassengers] = useState(2)
  const [luggage, setLuggage] = useState(2)
  const [vehicle, setVehicle] = useState<'standard' | 'large'>('standard')
  const [pickupAt, setPickupAt] = useState(defaultPickup())
  const [cap, setCap] = useState('70')

  const needsLarge = passengers > 4
  const effectiveVehicle = needsLarge ? 'large' : vehicle

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const region = regions.find((r) => r.id === airport)
    const capNum = Number(cap)
    if (!region || !destination.trim() || !pickupAt || !(capNum > 0)) return
    postJob({
      fromCode: region.code,
      fromName: region.name,
      to: destination.trim(),
      vehicle: effectiveVehicle,
      passengers,
      luggage,
      pickupAt: new Date(pickupAt).toISOString(),
      cap: capNum,
    })
    toast('Journey posted — finding a driver')
    onPosted()
  }

  return (
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-md mx-auto px-5 pt-20 pb-28">
        <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Operator</div>
        <h1 className="font-playfair italic text-4xl mt-1">Post a Journey</h1>
        <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
          Set your route and the most you'll pay. We find a trusted, verified driver to cover it —
          you only pay if it's covered.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label className={labelClass}>Pickup airport</label>
            <select value={airport} onChange={(e) => setAirport(e.target.value)} className={inputClass}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Destination</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              placeholder="e.g. Blackpool town centre"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Passengers</label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className={inputClass}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Luggage</label>
              <select
                value={luggage}
                onChange={(e) => setLuggage(Number(e.target.value))}
                className={inputClass}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Vehicle</label>
            <div className="grid grid-cols-2 gap-2">
              {(['standard', 'large'] as const).map((v) => {
                const disabled = v === 'standard' && needsLarge
                const active = effectiveVehicle === v
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={disabled}
                    onClick={() => setVehicle(v)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#F97316]/15 border-[#F97316]/50 text-[#FAFAFA]'
                        : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46]'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {v === 'standard' ? 'Standard · up to 4' : 'Large · up to 8'}
                  </button>
                )
              })}
            </div>
            {needsLarge && (
              <p className="mt-1.5 text-[11px] text-[#71717A]">
                Large vehicle required for {passengers} passengers.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Pickup time</label>
            <input
              type="datetime-local"
              value={pickupAt}
              onChange={(e) => setPickupAt(e.target.value)}
              required
              className={`${inputClass} [color-scheme:dark]`}
            />
          </div>

          <div>
            <label className={labelClass}>Most you'll pay</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-sm">£</span>
              <input
                type="number"
                min={1}
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                required
                className={`${inputClass} pl-7 tabular-nums`}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[#71717A]">
              You'll only ever be charged up to this amount.
            </p>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold py-3 rounded-lg transition-colors active:scale-[0.99]"
          >
            <Plane size={16} className="-rotate-45" />
            Post Journey
          </button>
        </form>
      </div>
    </div>
  )
}
