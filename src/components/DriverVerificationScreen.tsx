import { useState } from 'react'
import { ArrowLeft, Upload, ShieldCheck, Check, Loader } from 'lucide-react'
import { useVerification, type VerificationDetails } from '../lib/verification'
import { toast } from '../lib/toast'

const labelClass = 'block text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA] mb-1.5'
const inputClass =
  'w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#F97316]/60'

function FileField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (name: string) => void
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <label className="flex items-center gap-2 cursor-pointer bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm hover:border-[#3F3F46] transition-colors">
        <Upload size={15} className="text-[#A1A1AA] shrink-0" />
        <span className={`truncate ${value ? 'text-[#FAFAFA]' : 'text-[#52525B]'}`}>
          {value || 'Upload photo'}
        </span>
        {value && <Check size={15} className="ml-auto text-[#F97316] shrink-0" />}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
        />
      </label>
    </div>
  )
}

interface DriverVerificationScreenProps {
  onBack: () => void
  onDone: () => void
}

export default function DriverVerificationScreen({ onBack, onDone }: DriverVerificationScreenProps) {
  const { status, submit } = useVerification()
  const [f, setF] = useState<VerificationDetails>({
    phdNumber: '',
    phdExpiry: '',
    plate: '',
    plateExpiry: '',
    authority: 'Blackpool',
    vehicleCategory: 'standard',
    subcategory: '',
    passengerCapacity: 4,
    luggageCapacity: 3,
    badgeFile: '',
    plateFile: '',
  })
  const set = <K extends keyof VerificationDetails>(k: K, v: VerificationDetails[K]) =>
    setF((s) => ({ ...s, [k]: v }))

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.phdNumber || !f.plate || !f.badgeFile || !f.plateFile) return
    submit(f)
    toast('Submitted for verification')
    onDone()
  }

  // Already verified / pending — show status instead of the form.
  if (status !== 'unverified') {
    return (
      <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
        <button
          onClick={onBack}
          className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="max-w-md mx-auto px-5 pt-28 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#F97316]/15 border border-[#F97316]/40 flex items-center justify-center">
            {status === 'verified' ? (
              <ShieldCheck size={26} className="text-[#F97316]" />
            ) : (
              <Loader size={24} className="text-[#F97316] animate-spin" />
            )}
          </div>
          <h1 className="font-playfair italic text-3xl mt-4">
            {status === 'verified' ? "You're verified" : 'Verification in review'}
          </h1>
          <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
            {status === 'verified'
              ? 'Your licence and plate are verified. You can now cover work.'
              : "We're checking your PHD badge and council plate against the Blackpool licensing authority."}
          </p>
          <button
            onClick={onDone}
            className="mt-6 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {status === 'verified' ? 'Find work' : 'Done'}
          </button>
        </div>
      </div>
    )
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

      <div className="max-w-md mx-auto px-5 pt-20 pb-24">
        <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Driver</div>
        <h1 className="font-playfair italic text-4xl mt-1">Get verified</h1>
        <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
          Upload your Private Hire Driver badge and council vehicle plate. You can cover work once
          verified.
        </p>

        <form onSubmit={submitForm} className="mt-7 space-y-4">
          <div>
            <label className={labelClass}>Licensing authority</label>
            <select value={f.authority} disabled className={`${inputClass} opacity-70`}>
              <option>Blackpool</option>
            </select>
            <p className="mt-1.5 text-[11px] text-[#71717A]">Phase 1 covers the Blackpool licensing area.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>PHD badge no.</label>
              <input value={f.phdNumber} onChange={(e) => set('phdNumber', e.target.value)} required placeholder="BPL-12345" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Badge expiry</label>
              <input type="date" value={f.phdExpiry} onChange={(e) => set('phdExpiry', e.target.value)} required className={`${inputClass} [color-scheme:dark]`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vehicle plate</label>
              <input value={f.plate} onChange={(e) => set('plate', e.target.value)} required placeholder="PH-0987" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Plate expiry</label>
              <input type="date" value={f.plateExpiry} onChange={(e) => set('plateExpiry', e.target.value)} required className={`${inputClass} [color-scheme:dark]`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vehicle</label>
              <select value={f.vehicleCategory} onChange={(e) => set('vehicleCategory', e.target.value as 'standard' | 'large')} className={inputClass}>
                <option value="standard">Standard · up to 4</option>
                <option value="large">Large · up to 8</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Class (optional)</label>
              <select value={f.subcategory} onChange={(e) => set('subcategory', e.target.value as VerificationDetails['subcategory'])} className={inputClass}>
                <option value="">Any</option>
                <option value="saloon">Saloon</option>
                <option value="estate">Estate</option>
                <option value="executive">Executive</option>
                <option value="minibus">Minibus</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Passenger seats</label>
              <select value={f.passengerCapacity} onChange={(e) => set('passengerCapacity', Number(e.target.value))} className={inputClass}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Luggage</label>
              <select value={f.luggageCapacity} onChange={(e) => set('luggageCapacity', Number(e.target.value))} className={inputClass}>
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <FileField label="PHD badge photo" value={f.badgeFile} onChange={(v) => set('badgeFile', v)} />
          <FileField label="Vehicle plate photo" value={f.plateFile} onChange={(v) => set('plateFile', v)} />

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold py-3 rounded-lg transition-colors active:scale-[0.99]"
          >
            <ShieldCheck size={16} />
            Submit for verification
          </button>
        </form>
      </div>
    </div>
  )
}
