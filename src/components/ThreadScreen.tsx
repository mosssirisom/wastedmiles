import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BadgeCheck, Send } from 'lucide-react'
import { OPERATORS } from '../data/marketplace'
import { useMessages } from '../lib/messages'

interface ThreadScreenProps {
  operatorId: string
  onBack: () => void
}

export default function ThreadScreen({ operatorId, onBack }: ThreadScreenProps) {
  const op = OPERATORS[operatorId]
  const { getThread, sendMessage, ensureThread } = useMessages()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const messages = getThread(operatorId)

  useEffect(() => {
    ensureThread(operatorId)
  }, [operatorId, ensureThread])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!op) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    sendMessage(operatorId, t)
    setText('')
  }

  return (
    <div className="relative w-full h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 border-b border-[#27272A] bg-[#09090B]/95 backdrop-blur px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex items-center justify-center h-9 w-9 rounded-full bg-[#18181B] border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold tracking-[-0.02em] truncate">{op.name}</span>
          <BadgeCheck size={15} className="text-[#A1A1AA] shrink-0" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-[#71717A] py-10">
            Start the conversation with {op.name}.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                m.from === 'me'
                  ? 'bg-[#F97316] text-white'
                  : 'bg-[#18181B] border border-[#27272A] text-[#FAFAFA]'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={submit}
        className="shrink-0 flex items-center gap-2 border-t border-[#27272A] bg-[#09090B]/95 backdrop-blur px-3 py-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${op.name}…`}
          className="flex-1 bg-[#18181B] border border-[#27272A] rounded-full px-4 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#F97316]/60"
        />
        <button
          type="submit"
          aria-label="Send"
          className="h-10 w-10 shrink-0 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center justify-center transition-colors active:scale-95"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
