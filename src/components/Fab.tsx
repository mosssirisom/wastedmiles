import { useState } from 'react'
import { Plus, Send, LifeBuoy, Repeat, Radio } from 'lucide-react'

const ACTIONS = [
  { label: 'Post Journey', icon: Send },
  { label: 'Request Cover', icon: LifeBuoy },
  { label: 'Offer Empty Return', icon: Repeat },
  { label: 'Broadcast Driver Availability', icon: Radio },
]

// Expandable operator action button, bottom-right, opens upward.
// `lifted` raises it above the mobile bottom nav bar.
export default function Fab({ lifted = false }: { lifted?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[65]" onClick={() => setOpen(false)} />
      )}
      <div
        className={`absolute z-[70] right-6 flex flex-col-reverse items-end gap-3 ${
          lifted ? 'bottom-[88px] md:bottom-6' : 'bottom-6'
        }`}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Operator actions"
          aria-expanded={open}
          className="h-14 w-14 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white shadow-lg shadow-[#F97316]/30 flex items-center justify-center transition-colors active:scale-95"
        >
          <Plus
            size={24}
            className={`transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
          />
        </button>

        <div className="flex flex-col md:flex-col-reverse items-end gap-3">
          {ACTIONS.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: open ? `${i * 40}ms` : '0ms' }}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  open
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
              >
                <span className="whitespace-nowrap rounded-full bg-[#111113] backdrop-blur border border-[#27272A] text-[#FAFAFA] text-sm font-medium px-3.5 py-2 shadow-lg">
                  {action.label}
                </span>
                <span className="h-10 w-10 shrink-0 rounded-full bg-[#18181B] backdrop-blur border border-[#27272A] flex items-center justify-center text-[#FAFAFA]">
                  <Icon size={17} />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
