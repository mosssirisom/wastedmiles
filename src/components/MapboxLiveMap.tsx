import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

export default function MapboxLiveMap() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()
    if (!ref.current || !token) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: ref.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-3.2, 54.9],
      zoom: 5.35,
      attributionControl: false,
      logoPosition: 'bottom-left',
    })

    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

    return () => map.remove()
  }, [])

  return <div ref={ref} className="absolute inset-0 z-10 bg-[#09090B]" />
}
