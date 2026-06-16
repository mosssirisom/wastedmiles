import { useState } from 'react'
import { Home, List, Repeat, LifeBuoy, Menu as MenuIcon } from 'lucide-react'
import { useAuth } from '../lib/auth'

export type NavTab = 'home' | 'marketplace' | 'empty' | 'cover' | 'menu'

interface BottomNavProps {
  active: NavTab
  onHome: () => void
  onMarketplace: () => void
  onEmpty: () => void
  onCover: () => void
  onOperators: () => void
  onMyJourneys: () => void
  onMessages: () => void
  onNotifications: () => void
  onDashboard: () => void
  onSignIn: () => void
  onAccount: () => void
  onPost: () => void
  onPosted: () => void
  onFindWork: () => void
  onPricing: () => void
  onJoin: () => void
}

export default function BottomNav({
  active,
  onHome,
  onMarketplace,
  onEmpty,
  onCover,
  onOperators,
  onMyJourneys,
  onMessages,
  onNotifications,
  onDashboard,
  onSignIn,
  onAccount,
  onPost,
  onPosted,
  onFindWork,
  onPricing,
  onJoin,
}: BottomNavProps) {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const tabs: { id: NavTab; label: string; icon: typeof Home; onClick: () => void }[] = [
    { id: 'home', label: 'Home', icon: Home, onClick: onHome },
    { id: 'marketplace', label: 'Market', icon: List, onClick: onMarketplace },
    { id: 'empty', label: 'Empty Miles', icon: Repeat, onClick: onEmpty },
    { id: 'cover', label: 'Cover', icon: LifeBuoy, onClick: onCover },
    { id: 'menu', label: 'Menu', icon: MenuIcon, onClick: () => setMenuOpen(true) },
  ]

  return (
    <>
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
                onPost()
              }}
              className="mb-1 w-full text-center px-4 py-3 rounded-xl text-base font-medium bg-[#F97316] hover:bg-[#EA580C] text-white transition-colors"
            >
              Post a Journey
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onFindWork()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              Find Work
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onPosted()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              Posted Journeys
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onMyJourneys()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              My Journeys
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onMessages()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              Messages
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onNotifications()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              Notifications
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onDashboard()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onOperators()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              Operators
            </button>
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
                if (user) onAccount()
                else onSignIn()
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-base text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
            >
              {user ? 'Account' : 'Sign in'}
            </button>
            {!user && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onJoin()
                }}
                className="mt-2 w-full text-center px-4 py-3 rounded-xl text-base font-medium bg-[#F97316] hover:bg-[#EA580C] text-white transition-colors"
              >
                Join the Network
              </button>
            )}
          </div>
        </div>
      )}

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
