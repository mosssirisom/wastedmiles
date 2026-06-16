import { ArrowLeft, TrendingUp } from 'lucide-react'
import { DASHBOARD_METRICS } from '../data/marketplace'

// Deterministic bar heights for the mini revenue chart.
const WEEKS = [38, 52, 44, 61, 49, 70, 58, 82]

interface DashboardScreenProps {
  onBack: () => void
}

export default function DashboardScreen({ onBack }: DashboardScreenProps) {
  const max = Math.max(...WEEKS)

  return (
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-3xl mx-auto px-5 pt-20 pb-24">
        <div className="flex items-center gap-2 text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">
          <TrendingUp size={14} />
          Performance
        </div>
        <h1 className="font-playfair italic text-4xl mt-1">Dashboard</h1>
        <p className="text-[#A1A1AA] text-sm mt-2">Your recovered revenue and operational impact.</p>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
          {DASHBOARD_METRICS.map((m) => (
            <div key={m.label} className="rounded-2xl bg-[#111113] border border-[#27272A] p-4">
              <div className="text-2xl font-bold tabular-nums tracking-[-0.03em] text-[#FAFAFA]">
                {m.value}
              </div>
              <div className="text-xs text-[#A1A1AA] mt-1">{m.label}</div>
              {m.sub && <div className="text-[11px] text-[#52525B] mt-0.5">{m.sub}</div>}
            </div>
          ))}
        </div>

        {/* Revenue recovered chart */}
        <div className="mt-4 rounded-2xl bg-[#111113] border border-[#27272A] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#FAFAFA]">Revenue recovered</span>
            <span className="text-[11px] text-[#71717A]">last 8 weeks</span>
          </div>
          <div className="mt-4 flex items-end gap-2 h-28">
            {WEEKS.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div
                  className="w-full rounded-t-md bg-[#F97316]/80"
                  style={{ height: `${(v / max) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
