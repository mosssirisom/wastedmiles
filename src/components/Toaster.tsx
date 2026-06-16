import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

interface ToastItem {
  id: number
  msg: string
}

let counter = 0

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail
      const id = ++counter
      setToasts((t) => [...t, { id, msg }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
    }
    window.addEventListener('wm-toast', handler as EventListener)
    return () => window.removeEventListener('wm-toast', handler as EventListener)
  }, [])

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-sheet flex items-center gap-2 rounded-full border border-[#27272A] bg-[#18181B] px-4 py-2.5 text-sm font-medium text-[#FAFAFA] shadow-xl"
        >
          <Check size={15} className="text-[#F97316]" />
          {t.msg}
        </div>
      ))}
    </div>
  )
}
