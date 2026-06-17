import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Leaflet-compatible adapter backed by Mapbox GL, so existing `import L from
// 'leaflet'` map code runs on Mapbox (aliased in vite.config.ts). Only the
// subset of the Leaflet API our screens actually use is implemented.
//
// When VITE_MAPBOX_TOKEN is absent we cannot load Mapbox tiles, so the adapter
// falls back to a simple linear (equirectangular) projection over the padded
// container box. Base tiles are blank in that mode, but overlays still position
// correctly instead of collapsing into the top-left corner.

type LatLng = [number, number]
type Point = { x: number; y: number }
type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number }
type MapOptions = { attributionControl?: boolean }
type FitOptions = { paddingTopLeft?: [number, number]; paddingBottomRight?: [number, number] }

const INTERACTIONS = [
  'scrollZoom',
  'boxZoom',
  'dragPan',
  'dragRotate',
  'keyboard',
  'doubleClickZoom',
  'touchZoomRotate',
  'touchPitch',
] as const

class MapboxLeafletMap {
  private map: mapboxgl.Map | null = null
  private container: HTMLElement
  private bounds: Bounds | null = null
  private pad = { left: 0, top: 0, right: 0, bottom: 0 }
  private _loaded = false
  private _onLoadCb: (() => void) | null = null

  constructor(container: HTMLElement, options: MapOptions = {}) {
    this.container = container
    const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()
    if (!token) return // fallback projection mode (no tiles)

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-3.2, 54.9],
      zoom: 5.35,
      minZoom: 4.4,
      maxZoom: 12,
      attributionControl: false,
      logoPosition: 'bottom-left',
    })
    // Static map: overlays are projected once, so disable all camera input.
    for (const name of INTERACTIONS) {
      ;(map as unknown as Record<string, { disable?: () => void }>)[name]?.disable?.()
    }
    if (options.attributionControl !== false) {
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    }
    this.map = map

    // Mapbox GL initialises asynchronously. Defer fitBounds + projection until
    // the style/tiles have loaded — otherwise project() returns (0,0) and the
    // camera hasn't moved yet.
    map.once('load', () => {
      this._loaded = true
      if (this.bounds) {
        map.fitBounds(
          [
            [this.bounds.minLng, this.bounds.minLat],
            [this.bounds.maxLng, this.bounds.maxLat],
          ],
          { padding: this.pad, animate: false, duration: 0 }
        )
      }
      this._onLoadCb?.()
    })
  }

  // Register a callback that fires once the Mapbox style has loaded (or
  // immediately if it already has, or if running in fallback mode).
  onLoad(cb: () => void) {
    if (this._loaded || !this.map) {
      cb()
    } else {
      this._onLoadCb = cb
    }
  }

  setView(center: LatLng, zoom: number) {
    this.map?.jumpTo({ center: [center[1], center[0]], zoom })
    return this
  }

  fitBounds(bounds: Bounds, options: FitOptions = {}) {
    const tl = options.paddingTopLeft ?? [0, 0]
    const br = options.paddingBottomRight ?? [0, 0]
    this.pad = { left: tl[0], top: tl[1], right: br[0], bottom: br[1] }
    this.bounds = bounds
    if (this._loaded) {
      // Map already ready — apply immediately.
      this.map?.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: this.pad, animate: false, duration: 0 }
      )
    }
    // If not yet loaded, bounds are stored and applied inside the 'load' handler.
    return this
  }

  latLngToContainerPoint(latLng: LatLng): Point {
    if (this.map && this._loaded) {
      const p = this.map.project([latLng[1], latLng[0]])
      return { x: p.x, y: p.y }
    }
    // Fallback: linear projection across the padded container box.
    if (!this.bounds) return { x: 0, y: 0 }
    const rect = this.container.getBoundingClientRect()
    const innerW = Math.max(1, rect.width - this.pad.left - this.pad.right)
    const innerH = Math.max(1, rect.height - this.pad.top - this.pad.bottom)
    const { minLat, maxLat, minLng, maxLng } = this.bounds
    const fx = (latLng[1] - minLng) / (maxLng - minLng || 1)
    const fy = (maxLat - latLng[0]) / (maxLat - minLat || 1) // north -> top
    return { x: this.pad.left + fx * innerW, y: this.pad.top + fy * innerH }
  }

  invalidateSize() {
    this.map?.resize()
    return this
  }

  remove() {
    this.map?.remove()
    this.map = null
  }
}

const L = {
  map(container: HTMLElement, options?: MapOptions) {
    return new MapboxLeafletMap(container, options ?? {})
  },
  latLngBounds(latlngs: LatLng[]): Bounds {
    let minLat = Infinity
    let maxLat = -Infinity
    let minLng = Infinity
    let maxLng = -Infinity
    for (const [lat, lng] of latlngs) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
    return { minLat, maxLat, minLng, maxLng }
  },
  tileLayer() {
    // Mapbox provides its own basemap style; tile layers are a no-op.
    return { addTo: () => undefined }
  },
  divIcon(options: unknown) {
    return options
  },
}

export default L
