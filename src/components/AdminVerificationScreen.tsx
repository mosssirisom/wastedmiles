import { ArrowLeft, ShieldCheck, Check, X, FileText } from 'lucide-react'
import { useVerification, type VerificationRequest } from '../lib/verification'
import { toast } from '../lib/toast'

function ago(at: number) {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#71717A]">{label}</span>
      <span className="text-[#FAFAFA] font-medium">{value}</span>
    </div>
  )
}

function RequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: VerificationRequest
  onApprove: () => void
  onReject: () => void
}) {
  const d = req.details
  const vehicle =
    (d.vehicleCategory === 'large' ? 'Large' : 'Standard') +
    (d.subcategory ? ` · ${d.subcategory}` : '')
  return (
    <div className="rounded-2xl border border-[#27272A] bg-[#111113] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#FAFAFA] truncate">{req.name}</div>
          <div className="text-[11px] text-[#71717A] truncate">{req.email || 'no email'}</div>
        </div>
        {req.status === 'pending' ? (
          <span className="shrink-0 text-[11px] text-[#71717A]">{ago(req.submittedAt)}</span>
        ) : (
          <span
            className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
              req.status === 'verified'
                ? 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/40'
                : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
            }`}
          >
            {req.status === 'verified' ? 'Approved' : 'Rejected'}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <Row label="Authority" value={d.authority} />
        <Row label="PHD badge" value={`${d.phdNumber} · exp ${d.phdExpiry || '—'}`} />
        <Row label="Vehicle plate" value={`${d.plate} · exp ${d.plateExpiry || '—'}`} />
        <Row label="Vehicle" value={`${vehicle} · ${d.passengerCapacity} pax`} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#A1A1AA]">
        <span className="flex items-center gap-1 rounded-md border border-[#27272A] bg-[#18181B] px-2 py-1">
          <FileText size={12} /> {d.badgeFile || 'badge.jpg'}
        </span>
        <span className="flex items-center gap-1 rounded-md border border-[#27272A] bg-[#18181B] px-2 py-1">
          <FileText size={12} /> {d.plateFile || 'plate.jpg'}
        </span>
      </div>

      {req.status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            <Check size={15} /> Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#FAFAFA] text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            <X size={15} /> Reject
          </button>
        </div>
      )}
    </div>
  )
}

interface AdminVerificationScreenProps {
  onBack: () => void
}

export default function AdminVerificationScreen({ onBack }: AdminVerificationScreenProps) {
  const { requests, pendingCount, review } = useVerification()
  const sorted = [...requests].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    return b.submittedAt - a.submittedAt
  })

  return (
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-2xl mx-auto px-5 pt-20 pb-24">
        <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
          <ShieldCheck size={14} />
          Admin
        </div>
        <h1 className="font-playfair italic text-4xl mt-1">Verifications</h1>
        <p className="text-[#A1A1AA] text-sm mt-2">
          {pendingCount} pending {pendingCount === 1 ? 'review' : 'reviews'} · Blackpool licensing area
        </p>

        <div className="mt-6 space-y-3">
          {sorted.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onApprove={() => {
                review(req.id, 'verified')
                toast(`${req.name} approved`)
              }}
              onReject={() => {
                review(req.id, 'rejected')
                toast(`${req.name} rejected`)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
