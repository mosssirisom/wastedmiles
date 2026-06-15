import { useCallback, useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import L from 'leaflet'
import { SATELLITE_TILES, DARK_TILES, ATTRIBUTION } from '../lib/map'
import type { Town } from '../data/jobs'

const SPOTLIGHT_R = 260

// Display view: North West England — the service area.
const MAP_CENTER: [number, number] = [54.0, -2.7]
const MAP_ZOOM = 8

interface RevealLayerProps {
  cursorX: number
  cursorY: number
}

// Reveal layer: the dark map, visible only inside the cursor spotlight.
function RevealLayer({ cursorX, cursorY }: RevealLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const el = mapDivRef.current
    if (!el) return
    const map = L.map(el, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    })
    L.tileLayer(DARK_TILES, { subdomains: 'abcd', maxZoom: 19 }).addTo(map)
    const onResize = () => map.invalidateSize()
    setTimeout(() => map.invalidateSize(), 0)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const reveal = revealRef.current
    if (!canvas || !reveal) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const gradient = ctx.createRadialGradient(
      cursorX,
      cursorY,
      0,
      cursorX,
      cursorY,
      SPOTLIGHT_R
    )
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.75)')
    gradient.addColorStop(0.75, 'rgba(255,255,255,0.4)')
    gradient.addColorStop(0.88, 'rgba(255,255,255,0.12)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cursorX, cursorY, SPOTLIGHT_R, 0, Math.PI * 2)
    ctx.fill()

    const dataUrl = canvas.toDataURL()
    reveal.style.maskImage = `url(${dataUrl})`
    reveal.style.webkitMaskImage = `url(${dataUrl})`
    reveal.style.maskSize = '100% 100%'
    reveal.style.webkitMaskSize = '100% 100%'
  })

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ display: 'none' }}
      />
      <div ref={revealRef} className="absolute inset-0 z-30 pointer-events-none">
        <div ref={mapDivRef} className="absolute inset-0" />
      </div>
    </>
  )
}

interface PinPos {
  id: string
  name: string
  count: number
  x: number
  y: number
}

interface HeroProps {
  towns: Town[]
  onSelectTown: (id: string) => void
}

export default function Hero({ towns, onSelectTown }: HeroProps) {
  const mouse = useRef({ x: -999, y: -999 })
  const smooth = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number>(0)
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 })

  const baseDivRef = useRef<HTMLDivElement>(null)
  const baseMapRef = useRef<L.Map | null>(null)
  const townsRef = useRef(towns)
  townsRef.current = towns
  const [pins, setPins] = useState<PinPos[]>([])

  // Project the current towns onto the static map's pixel coordinates.
  const computePins = useCallback(() => {
    const map = baseMapRef.current
    if (!map) return
    setPins(
      townsRef.current.map((t) => {
        const p = map.latLngToContainerPoint(t.center)
        return { id: t.id, name: t.name, count: t.jobs.length, x: p.x, y: p.y }
      })
    )
  }, [])

  // Base satellite map.
  useEffect(() => {
    const el = baseDivRef.current
    if (!el) return
    const map = L.map(el, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    })
    baseMapRef.current = map
    L.tileLayer(SATELLITE_TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map)

    const onResize = () => {
      map.invalidateSize()
      computePins()
    }
    setTimeout(() => {
      map.invalidateSize()
      computePins()
    }, 0)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      baseMapRef.current = null
    }
  }, [computePins])

  // Re-project pins whenever the town data changes (e.g. after fetch).
  useEffect(() => {
    computePins()
  }, [towns, computePins])

  // Smoothed cursor tracking for the spotlight.
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
    }
    window.addEventListener('mousemove', handleMove)

    const loop = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1
      setCursorPos({ x: smooth.current.x, y: smooth.current.y })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 256 256" fill="#ffffff">
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="text-white text-2xl font-playfair italic">Lithos</span>
        </div>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
          <button className="text-white px-4 py-1.5 rounded-full text-sm font-medium">
            Course
          </button>
          {['Field Guides', 'Geology', 'Plans', 'Live Tour'].map((item) => (
            <button
              key={item}
              className="text-white/80 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/20 hover:text-white transition-colors"
            >
              {item}
            </button>
          ))}
        </div>

        <button className="hidden md:block bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100">
          Sign Up
        </button>

        <button className="md:hidden text-white" aria-label="Menu">
          <Menu size={26} />
        </button>
      </nav>

      {/* Hero section */}
      <section
        className="relative w-full overflow-hidden h-screen bg-black"
        style={{ height: '100dvh' }}
      >
        {/* Base layer: satellite map */}
        <div ref={baseDivRef} className="absolute inset-0 z-10" />

        {/* Reveal layer: dark map under the spotlight */}
        <RevealLayer cursorX={cursorPos.x} cursorY={cursorPos.y} />

        {/* Clickable town pins */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          {pins.map((pin) => (
            <button
              key={pin.id}
              onClick={() => onSelectTown(pin.id)}
              style={{ left: pin.x, top: pin.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-2 group"
            >
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e8702a] opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#e8702a] border-2 border-white shadow" />
              </span>
              <span className="whitespace-nowrap bg-white/90 backdrop-blur text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg group-hover:bg-white group-hover:scale-105 transition">
                {pin.name} · {pin.count} jobs
              </span>
            </button>
          ))}
        </div>

        {/* Heading */}
        <div className="absolute top-[14%] left-0 right-0 z-50 flex flex-col items-center text-center px-5 pointer-events-none">
          <h1 className="text-white leading-[0.95]">
            <span
              className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
              style={{ letterSpacing: '-0.05em', animationDelay: '0.25s' }}
            >
              Layers hold
            </span>
            <span
              className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
              style={{ letterSpacing: '-0.08em', animationDelay: '0.42s' }}
            >
              tales of time
            </span>
          </h1>
        </div>

        {/* Bottom-left paragraph */}
        <div
          className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 hero-anim hero-fade"
          style={{ animationDelay: '0.7s' }}
        >
          <p className="text-sm text-white/80 leading-relaxed">
            Every layer of sediment records a chapter of our planet, from ancient
            seabeds to drifting ash, layered across millions of years beneath us.
          </p>
        </div>

        {/* Bottom-right block */}
        <div
          className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] z-50 flex flex-col items-start gap-4 sm:gap-5 hero-anim hero-fade"
          style={{ animationDelay: '0.85s' }}
        >
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Tap any town to peel back the crust and trace the roles we cover across
            the North West — from the coast to the fells.
          </p>
          <button className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30">
            Start Digging
          </button>
        </div>
      </section>
    </>
  )
}
