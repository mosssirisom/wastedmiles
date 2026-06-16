import { ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'

interface AccountScreenProps {
  onBack: () => void
  onSignedOut: () => void
}

export default function AccountScreen({ onBack, onSignedOut }: AccountScreenProps) {
  const { user, signOut } = useAuth()
  if (!user) return null

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
        <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Account</div>

        <div className="mt-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-xl font-semibold text-[#FAFAFA]">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] truncate">{user.name}</h1>
            <div className="text-sm text-[#71717A] truncate">{user.email}</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#27272A] bg-[#111113] divide-y divide-[#27272A]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-[#A1A1AA]">Operator ID</span>
            <span className="text-sm text-[#FAFAFA] tabular-nums">{user.operatorId}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-[#A1A1AA]">Status</span>
            <span className="text-sm text-[#F97316] font-medium">Verified operator</span>
          </div>
        </div>

        <button
          onClick={() => {
            signOut()
            onSignedOut()
          }}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#FAFAFA] text-sm font-medium py-3 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )
}
