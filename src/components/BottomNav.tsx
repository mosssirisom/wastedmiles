import { useState } from 'react'
import { Home, Repeat, LifeBuoy, BadgeCheck, Menu as MenuIcon } from 'lucide-react'

export type NavTab = 'market' | 'empty' | 'cover' | 'operators' | 'menu'

interface BottomNavProps {
  active: NavTab
  onHome: () => void
  onEmpty: () => void
  onCover: () => void
  onOperators: () => void
  onPricing: () => void
  onJoin: () => void
}

export default function BottomNav({
  active,
  onHome,
  onEmpty,
  onCover,
  onOperators,
  onPricing,
  onJoin,
}: BottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const tabs: { id: NavTab; label: string; icon: typeof Home; onClick: () => void }[] = [
    { id: 'market', label: 'Home', icon: Home, onClick: onHome },
    { id: 'empty', label: 'Empty Miles', icon: Repeat, onClick: onEmpty },
    { id: 'cover', label: 'Cover', icon: LifeBuoy, onClick: onCover },
    { id: 'operators', label: 'Operators', icon: BadgeCheck, onClick: onOperators },
    { id: 'menu', label: 'Menu', icon: MenuIcon, onClick: () => setMenuOpen(true) },
  ]

  return (
    <>
      {/* Menu sheet (Pricing / Join) */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end"
          onClick={() => setMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative animate-sheet mb-[60px] rounded-t-2xl border-t border-[#27272A] bg-[#111113] px-3 pt-2 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#27272A]" />
            <button
              onClick={() => {
                setMenuOpen(false)
                onPricing()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onJoin()
              }}
              className="mt-2 w-full text-center px-4 py-3 rounded-xl text-base font-medium bg-[#F97316] hover:bg-[#EA580C] text-white transition-colors"
            >
              Join the Network
            </button>
          </div>
        </div>
      )}

      {/* Persistent bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[95] flex border-t border-[#27272A] bg-[#111113]/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map((t) => {
          const Icon = t.icon
          const on = active === t.id
          return (
            <button
              key={t.id}
              onClick={t.onClick}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                on ? 'text-[#FAFAFA]' : 'text-[#71717A]'
              }`}
            >
              <Icon size={20} strokeWidth={on ? 2.4 : 2} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
