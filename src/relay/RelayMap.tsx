import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { type Airport, type NetworkSnapshot } from './data'

// -----------------------------------------------------------------------------
// RelayMap — isolated, self-contained Mapbox map for the Relay home screen.
//
// Owns the map section (explicit available height), the Mapbox container, the
// projected overlays (heatmap / routes / hotspots) and a stylised fallback
// background when no token is configured or tiles fail to load.
//
// Sizing approach (the thing that kept biting us): the section has a definite
// height, the Mapbox container is absolutely filled to 100% x 100%, global CSS
// forces the canvas to 100% (see index.css), and we call map.resize() on
// create, after a tick, on window resize / orientationchange, and whenever the
// bottom sheet toggles (resizeSignal). Mapbox can therefore never read a 0px
// height and fall back to its hardcoded 300px canvas.
// -----------------------------------------------------------------------------

const ACCENT = '#06B6D4'
const LINE = '#1E293B'

type Pt = { x: number; y: number }

function Hotspot({ airport, pt }: { airport: Airport; pt: Pt }) {
  const primary = airport.primary
  return (
    <div className="absolute z-20 flex flex-col items-center" style={{ left: pt.x, top: pt.y, transform: 'translate(-50%, -100%)' }}>
      <div
        className="rounded-xl border px-3 py-2 text-center"
        style={{
          background: 'rgba(15,23,42,0.95)',
          borderColor: primary ? 'rgba(6,182,212,0.6)' : LINE,
          boxShadow: primary ? '0 0 22px rgba(6,182,212,0.45)' : '0 8px 20px rgba(0,0,0,0.55)',
        }}
      >
        <div className="text-[12px] font-bold text-white leading-none">{airport.code}</div>
        <div className="text-[10px] text-white/50 mt-1 leading-none">{airport.jobs} Jobs</div>
        <div className="text-[13px] font-bold leading-tight mt-0.5" style={{ color: ACCENT }}>
          {airport.rev}
        </div>
      </div>
      <div className="h-2 w-2 rotate-45 -mt-1 border-r border-b" style={{ background: 'rgba(15,23,42,0.95)', borderColor: primary ? 'rgba(6,182,212,0.6)' : LINE }} />
      <div className="relative mt-1 flex items-center justify-center">
        <span className="absolute h-5 w-5 rounded-full animate-ping" style={{ background: 'rgba(6,182,212,0.35)' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: ACCENT, boxShadow: '0 0 12px rgba(6,182,212,0.9)' }} />
      </div>
    </div>
  )
}

// Linear (equirectangular) projection over the padded container box — used both
// before tiles load and as the fallback when no Mapbox token is present.
function fallbackProject(airports: Airport[], w: number, h: number): Record<string, Pt> {
  const out: Record<string, Pt> = {}
  if (!airports.length || w <= 0 || h <= 0) return out
  const lats = airports.map((a) => a.lat)
  const lngs = airports.map((a) => a.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const padX = Math.min(70, w * 0.18)
  const padTop = Math.min(120, h * 0.22)
  const padBottom = Math.min(170, h * 0.3)
  const innerW = Math.max(1, w - padX * 2)
  const innerH = Math.max(1, h - padTop - padBottom)
  airports.forEach((a) => {
    const fx = (a.lng - minLng) / (maxLng - minLng || 1)
    const fy = (maxLat - a.lat) / (maxLat - minLat || 1) // north -> top
    out[a.code] = { x: padX + fx * innerW, y: padTop + fy * innerH }
  })
  return out
}

export default function RelayMap({
  network,
  resizeSignal,
}: {
  network: NetworkSnapshot | null
  resizeSignal?: unknown
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [pts, setPts] = useState<Record<string, Pt> | null>(null)
  const [usingTiles, setUsingTiles] = useState(false)

  const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()

  // Keep the latest network in a ref so the projection effect can read it
  // without re-subscribing on every render.
  const netRef = useRef(network)
  netRef.current = network
  const sig = network ? network.airports.map((a) => `${a.code}:${a.lat}:${a.lng}`).join('|') : ''

  // --- Create the map once -----------------------------------------------------
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-3.2, 54.9],
      zoom: 5.35,
      minZoom: 4.4,
      maxZoom: 12,
      attributionControl: false,
      interactive: false, // static overlay map
    })
    map.on('error', () => setUsingTiles(false))
    map.on('load', () => {
      map.resize()
      setUsingTiles(true)
    })
    mapRef.current = map
    // Force an initial resize right after creation (requirement: never 0px).
    map.resize()
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [token])

  // --- Resize + project --------------------------------------------------------
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current
      const net = netRef.current
      if (!el || !net || !net.airports.length) return
      const w = el.clientWidth
      const h = el.clientHeight
      const map = mapRef.current

      if (map && usingTiles) {
        map.resize()
        const lats = net.airports.map((a) => a.lat)
        const lngs = net.airports.map((a) => a.lng)
        try {
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            {
              padding: {
                top: Math.min(110, h * 0.2),
                bottom: Math.min(170, h * 0.3),
                left: Math.min(64, w * 0.15),
                right: Math.min(64, w * 0.15),
              },
              animate: false,
              duration: 0,
            }
          )
        } catch {
          /* bounds degenerate — ignore */
        }
        const out: Record<string, Pt> = {}
        net.airports.forEach((a) => {
          const p = map.project([a.lng, a.lat])
          out[a.code] = { x: p.x, y: p.y }
        })
        setPts(out)
      } else {
        // No tiles yet (or no token) — keep the container sized and project
        // linearly so the overlays still render over the fallback background.
        map?.resize()
        setPts(fallbackProject(net.airports, w, h))
      }
    }

    compute()
    const t1 = window.setTimeout(compute, 100)
    const t2 = window.setTimeout(compute, 400)
    const onResize = () => compute()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    const ro = containerRef.current ? new ResizeObserver(() => compute()) : null
    if (ro && containerRef.current) ro.observe(containerRef.current)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      ro?.disconnect()
    }
  }, [sig, resizeSignal, token, usingTiles])

  const ready = !!(pts && network)
  const dotCss =
    ready &&
    `.relaydot{position:absolute;width:4px;height:4px;border-radius:9999px;background:${ACCENT};box-shadow:0 0 8px ${ACCENT};transform:translate(-50%,-50%);}
${network!.routes
      .filter((r) => pts![r.from] && pts![r.to])
      .map(
        (r, i) =>
          `@keyframes relayflow${i}{0%{left:${pts![r.from].x}px;top:${pts![r.from].y}px;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:${pts![r.to].x}px;top:${pts![r.to].y}px;opacity:0}}`
      )
      .join('\n')}`

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: '100%', minHeight: '480px' }}
    >
      {/* Mapbox container — absolutely filled, forced to 100% (see index.css) */}
      <div ref={containerRef} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%', background: '#030712' }} />

      {/* Stylised fallback backdrop when tiles aren't available */}
      {!usingTiles && (
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'radial-gradient(120% 90% at 50% 32%, rgba(6,182,212,0.12), transparent 60%), #030712' }}
        >
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" style={{ opacity: 0.1 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`v${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" stroke="#06B6D4" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={`${(i + 1) * 8}%`} x2="100%" y2={`${(i + 1) * 8}%`} stroke="#06B6D4" strokeWidth="0.5" />
            ))}
          </svg>
        </div>
      )}

      {/* depth / vignette */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(3,7,18,0.85))' }}
      />

      {ready && pts && (
        <>
          <style>{dotCss}</style>

          {/* heatmap */}
          {network!.airports.map((a) =>
            pts[a.code] ? (
              <div
                key={a.code}
                className="absolute z-[6] rounded-full blur-2xl pointer-events-none"
                style={{
                  left: pts[a.code].x,
                  top: pts[a.code].y,
                  width: 150 + a.jobs * 5,
                  height: 150 + a.jobs * 5,
                  transform: 'translate(-50%,-50%)',
                  background: 'radial-gradient(closest-side, rgba(6,182,212,0.25), transparent)',
                }}
              />
            ) : null
          )}

          {/* routes */}
          <svg className="absolute inset-0 h-full w-full z-10 pointer-events-none">
            {network!.routes.map((r, i) =>
              pts[r.from] && pts[r.to] ? (
                <line
                  key={i}
                  x1={pts[r.from].x}
                  y1={pts[r.from].y}
                  x2={pts[r.to].x}
                  y2={pts[r.to].y}
                  stroke={ACCENT}
                  strokeOpacity="0.3"
                  strokeWidth="1.3"
                  strokeDasharray="3 7"
                  strokeLinecap="round"
                  className="arc-flow"
                />
              ) : null
            )}
          </svg>

          {/* live moving dots */}
          {network!.routes.flatMap((r, i) =>
            pts[r.from] && pts[r.to]
              ? [0, 1.4, 2.8].map((delay, j) => (
                  <span key={`${i}-${j}`} className="relaydot z-10" style={{ animation: `relayflow${i} 4s linear infinite`, animationDelay: `-${delay}s` }} />
                ))
              : []
          )}

          {/* hotspots */}
          {network!.airports.map((a) => (pts[a.code] ? <Hotspot key={a.code} airport={a} pt={pts[a.code]} /> : null))}
        </>
      )}
    </section>
  )
}
