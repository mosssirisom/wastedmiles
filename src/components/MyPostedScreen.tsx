import { ArrowLeft, ArrowRight, Plane, Plus, Check, Loader, CreditCard } from 'lucide-react'
import { useJobs, completeJob, type PostedJob } from '../lib/jobsStore'
import { formatGBP } from '../data/marketplace'
import { useBilling } from '../lib/billing'

function formatPickup(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (sameDay) return `Today ${time}`
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`
}

function Card({
  job,
  last4,
  onAddPayment,
}: {
  job: PostedJob
  last4?: string
  onAddPayment: () => void
}) {
  const covered = job.status === 'covered'
  const completed = job.status === 'completed'
  const settled = covered || completed

  return (
    <div className="rounded-2xl border border-[#27272A] bg-[#111113] p-4">
      <div className="flex items-start justify-between gap-3">
        {completed ? (
          <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border bg-[#18181B] text-[#D4D4D8] border-[#27272A]">
            <Check size={12} /> Completed
          </span>
        ) : covered ? (
          <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border bg-[#F97316]/15 text-[#F97316] border-[#F97316]/40">
            <Check size={12} /> Covered
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border bg-[#18181B] text-[#A1A1AA] border-[#27272A]">
            <Loader size={12} className="animate-spin" /> Finding a driver
          </span>
        )}
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums tracking-[-0.02em] text-[#FAFAFA]">
            {formatGBP(job.cap)}
          </div>
          <div className="text-[11px] text-[#71717A]">{settled ? 'you pay' : 'up to'}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 text-[15px] font-semibold text-[#FAFAFA]">
        <Plane size={14} className="-rotate-45 text-[#71717A] shrink-0" />
        <span className="shrink-0">{job.fromCode}</span>
        <ArrowRight size={14} className="text-[#52525B] shrink-0" />
        <span className="truncate">{job.to}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#71717A]">
        <span>{job.vehicle === 'large' ? 'Large · up to 8' : 'Standard · up to 4'}</span>
        <span>{job.passengers} pax</span>
        <span>{job.luggage} bags</span>
        <span>{formatPickup(job.pickupAt)}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-[#27272A] text-xs space-y-2">
        {!settled && (
          <span className="text-[#71717A]">Pending — we're matching the best available driver.</span>
        )}

        {settled && (
          <div className="text-[#A1A1AA]">
            {completed ? 'Completed by ' : 'Covered by '}
            <span className="text-[#FAFAFA] font-medium">{job.driverName}</span> — verified operator
          </div>
        )}

        {settled &&
          (last4 ? (
            <div className="flex items-center gap-1.5 text-[#71717A]">
              <CreditCard size={13} />
              {formatGBP(job.cap)} charged to •••• {last4} ·{' '}
              {completed ? 'released' : 'held in escrow'}
            </div>
          ) : (
            <button onClick={onAddPayment} className="text-[#F97316] font-medium hover:underline">
              Add a payment method to complete
            </button>
          ))}

        {covered && last4 && (
          <button
            onClick={() => completeJob(job.id)}
            className="mt-1 w-full bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium py-2.5 rounded-lg transition-colors active:scale-[0.99]"
          >
            Mark journey complete
          </button>
        )}
      </div>
    </div>
  )
}

interface MyPostedScreenProps {
  onBack: () => void
  onPost: () => void
  onAddPayment: () => void
}

export default function MyPostedScreen({ onBack, onPost, onAddPayment }: MyPostedScreenProps) {
  const { posted: jobs } = useJobs()
  const { card } = useBilling()

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Operator</div>
            <h1 className="font-playfair italic text-4xl mt-1">Posted Journeys</h1>
          </div>
          <button
            onClick={onPost}
            className="flex items-center gap-1.5 shrink-0 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
          >
            <Plus size={16} />
            Post
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
              <Plane size={20} className="-rotate-45 text-[#52525B]" />
            </div>
            <p className="mt-3 text-sm text-[#71717A]">
              No posted journeys yet. Post one and we'll find a driver to cover it.
            </p>
            <button
              onClick={onPost}
              className="mt-5 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Post a Journey
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {jobs.map((j) => (
              <Card key={j.id} job={j} last4={card?.last4} onAddPayment={onAddPayment} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
