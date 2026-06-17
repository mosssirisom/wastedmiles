import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { formatGBP, regionMetrics, type Region } from '../data/marketplace'

type Pin = { id: string; code: string; name: string; value: string; x: number; y: number }

export default function MapboxLiveMap({ regions = [] }: { regions?: Region[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const regionsRef = useRef(regions)
  const [pins, setPins] = useState<Pin[]>([])
  regionsRef.current = regions

  const syncPins = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    setPins(
      regionsRef.current.map((r) => {
        const point = map.project([r.center[1], r.center[0]])
        return {
          id: r.id,
          code: r.code,
          name: r.name,
          value: formatGBP(regionMetrics(r).revenue),
          x: point.x,
          y: point.y,
        }
      })
    )
  }, [])

  useEffect(() => {
    const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()
    if (!ref.current || !token || mapRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: ref.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-3.2, 54.9],
      zoom: 5.35,
      minZoom: 4.5,
      maxZoom: 10,
      attributionControl: false,
      logoPosition: 'bottom-left',
    })

    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    map.on('load', syncPins)
    map.on('move', syncPins)
    map.on('resize', syncPins)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [syncPins])

  useEffect(() => syncPins(), [regions, syncPins])

  return (
    <>
      <div ref={ref} className="absolute inset-0 z-10 bg-[#09090B]" />
      <div className="absolute inset-0 z-40 pointer-events-none">
        {pins.map((pin) => (
          <div key={pin.id} style={{ left: pin.x, top: pin.y }} className="absolute -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-lg border border-[#27272A] bg-[#111113]/85 px-2 py-1 text-center leading-none shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <div className="text-[11px] font-semibold text-[#FAFAFA]">{pin.code}</div>
              <div className="mt-0.5 text-[10px] text-[#A1A1AA]">{pin.value}</div>
            </div>
          </div>
        ))}
      </div>
      {!import.meta.env.VITE_MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090B] text-center">
          <div className="mx-6 rounded-2xl border border-[#27272A] bg-[#111113]/90 p-5 text-xs text-[#A1A1AA]">
            Add VITE_MAPBOX_TOKEN in Vercel to enable Mapbox.
          </div>
        </div>
      )}
    </>
  )
}
