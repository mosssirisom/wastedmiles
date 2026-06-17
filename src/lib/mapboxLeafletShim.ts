import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

type LatLng = [number, number]
type MapOptions = { center?: LatLng; zoom?: number; attributionControl?: boolean }
type Point = { x: number; y: number }

class MapboxLeafletMap {
  private map: mapboxgl.Map | null = null

  constructor(container: HTMLElement, options: MapOptions = {}) {
    const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()
    if (!token) return

    mapboxgl.accessToken = token
    this.map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [options.center?.[1] ?? -3.2, options.center?.[0] ?? 54.9],
      zoom: options.zoom ?? 5.35,
      minZoom: 4.4,
      maxZoom: 10,
      attributionControl: false,
      logoPosition: 'bottom-left',
    })

    this.map.dragRotate.disable()
    this.map.touchZoomRotate.disableRotation()

    if (options.attributionControl !== false) {
      this.map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    }
  }

  latLngToContainerPoint(latLng: LatLng): Point {
    if (!this.map) return { x: 0, y: 0 }
    const p = this.map.project([latLng[1], latLng[0]])
    return { x: p.x, y: p.y }
  }

  invalidateSize() {
    this.map?.resize()
  }

  remove() {
    this.map?.remove()
    this.map = null
  }
}

const L = {
  map(container: HTMLElement, options?: MapOptions) {
    return new MapboxLeafletMap(container, options)
  },
  tileLayer() {
    return { addTo: () => undefined }
  },
  divIcon(options: unknown) {
    return options
  },
}

export default L
