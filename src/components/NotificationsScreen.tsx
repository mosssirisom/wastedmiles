import { useEffect } from 'react'
import { ArrowLeft, Bell, LifeBuoy, MessageSquare, Check, Info } from 'lucide-react'
import { useNotifications, markAllRead, type NotifKind } from '../lib/notifications'

const ICON: Record<NotifKind, typeof Bell> = {
  urgent: LifeBuoy,
  message: MessageSquare,
  claim: Check,
  system: Info,
}

const ICON_COLOR: Record<NotifKind, string> = {
  urgent: 'text-[#EF4444]',
  message: 'text-[#A1A1AA]',
  claim: 'text-[#F97316]',
  system: 'text-[#A1A1AA]',
}

function ago(at: number) {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

interface NotificationsScreenProps {
  onBack: () => void
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const { list } = useNotifications()

  useEffect(() => {
    markAllRead()
  }, [])

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
          <Bell size={14} />
          Alerts
        </div>
        <h1 className="font-playfair italic text-4xl mt-1">Notifications</h1>

        {list.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
              <Bell size={20} className="text-[#52525B]" />
            </div>
            <p className="mt-3 text-sm text-[#71717A]">You're all caught up.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {list.map((n) => {
              const Icon = ICON[n.kind]
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-xl border border-[#27272A] bg-[#111113] p-4"
                >
                  <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
                    <Icon size={15} className={ICON_COLOR[n.kind]} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#FAFAFA]">{n.title}</span>
                      <span className="shrink-0 text-[11px] text-[#52525B]">{ago(n.at)}</span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-0.5 leading-snug">{n.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
