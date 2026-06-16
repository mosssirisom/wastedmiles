import { ArrowLeft, MessageSquare, BadgeCheck } from 'lucide-react'
import { OPERATORS } from '../data/marketplace'
import { useMessages } from '../lib/messages'

interface MessagesScreenProps {
  onBack: () => void
  onOpenThread: (operatorId: string) => void
}

export default function MessagesScreen({ onBack, onOpenThread }: MessagesScreenProps) {
  const { getThreads } = useMessages()
  const threads = getThreads()

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
          <MessageSquare size={14} />
          Inbox
        </div>
        <h1 className="font-playfair italic text-4xl mt-1">Messages</h1>

        {threads.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
              <MessageSquare size={20} className="text-[#52525B]" />
            </div>
            <p className="mt-3 text-sm text-[#71717A]">
              No conversations yet. Message an operator to start one.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {threads.map((t) => {
              const op = OPERATORS[t.operatorId]
              const last = t.messages[t.messages.length - 1]
              return (
                <button
                  key={t.operatorId}
                  onClick={() => onOpenThread(t.operatorId)}
                  className="w-full text-left flex items-center gap-3 rounded-xl border border-[#27272A] bg-[#111113] p-4 hover:border-[#3F3F46] transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-sm font-semibold text-[#FAFAFA]">
                    {op.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-[#FAFAFA] truncate">{op.name}</span>
                      <BadgeCheck size={14} className="text-[#A1A1AA] shrink-0" />
                    </div>
                    <div className="text-xs text-[#71717A] truncate">
                      {last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : 'No messages yet'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
