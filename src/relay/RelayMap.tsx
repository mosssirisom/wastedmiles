import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { CATEGORY_META, jobsGeoJSON, type JobCategory, type MarketJob } from './marketplaceJobs'

// -----------------------------------------------------------------------------
// RelayMap — the product. An interactive, clustered marketplace map.
//
// * Mapbox native clustering (handles thousands of points at 60fps).
// * Clusters show count + total £ value; declustered on zoom.
// * Individual jobs coloured by category, urgent jobs pulse.
// * Selecting a job draws its pickup -> dropoff route and frames it.
// * Pan/zoom always enabled; the map is never secondary.
// -----------------------------------------------------------------------------

// Default pickup focus when geolocation isn't available — a busy hub, never
// the whole UK (we always open "near work").
const DEFAULT_DRIVER: [number, number] = [-2.272, 53.365] // Manchester area

export type DriverStatus = 'available' | 'busy' | 'unavailable' | 'offline'
export const DRIVER_STATUS_COLOR: Record<DriverStatus, string> = {
  available: '#22C55E',
  busy: '#F59E0B',
  unavailable: '#EF4444',
  offline: '#94A3B8',
}

export default function RelayMap({
  jobs,
  filter,
  selectedId,
  onSelectJob,
  onClusterTap,
  resizeSignal,
  driverStatus = 'available',
  follow = false,
  recenterKey = 0,
  onFollowChange,
  onLocation,
}: {
  jobs: MarketJob[]
  filter: JobCategory | 'all'
  selectedId: string | null
  onSelectJob: (id: string | null) => void
  onClusterTap?: () => void
  resizeSignal?: unknown
  driverStatus?: DriverStatus
  follow?: boolean
  recenterKey?: number
  onFollowChange?: (v: boolean) => void
  onLocation?: (loc: [number, number]) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [ready, setReady] = useState(false)
  const [tiles, setTiles] = useState(false)

  // Driver marker + geolocation refs.
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const arrowPathRef = useRef<SVGPathElement | null>(null)
  const arrowWrapRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef(0)
  const locRef = useRef<[number, number] | null>(null)
  const firstFix = useRef(false)
  const followRef = useRef(follow)
  followRef.current = follow
  const onFollowChangeRef = useRef(onFollowChange)
  onFollowChangeRef.current = onFollowChange
  const onLocationRef = useRef(onLocation)
  onLocationRef.current = onLocation

  // Keep latest callbacks/data in refs so the one-time init effect stays stable.
  const jobsRef = useRef(jobs)
  jobsRef.current = jobs
  const filterRef = useRef(filter)
  filterRef.current = filter
  const selectRef = useRef(onSelectJob)
  selectRef.current = onSelectJob
  const clusterTapRef = useRef(onClusterTap)
  clusterTapRef.current = onClusterTap

  const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()

  const filtered = (list: MarketJob[]) =>
    filterRef.current === 'all' ? list : list.filter((j) => j.category === filterRef.current)

  // --- create map once --------------------------------------------------------
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DEFAULT_DRIVER,
      zoom: 8.6,
      minZoom: 4.2,
      maxZoom: 16,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('error', () => setTiles(false))

    map.on('load', () => {
      map.resize()
      setTiles(true)

      map.addSource('jobs', {
        type: 'geojson',
        data: jobsGeoJSON(filtered(jobsRef.current)) as never,
        cluster: true,
        clusterRadius: 52,
        clusterMaxZoom: 12,
        clusterProperties: { sum: ['+', ['get', 'value']] },
      })
      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as never })

      // Revenue heatmap glow under dense clusters.
      map.addLayer({
        id: 'job-heat',
        type: 'circle',
        source: 'jobs',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['interpolate', ['linear'], ['get', 'sum'], 1500, '#0EA5E9', 14000, '#22C55E'],
          'circle-opacity': 0.1,
          'circle-blur': 1,
          'circle-radius': ['step', ['get', 'point_count'], 26, 8, 46, 25, 70],
        } as never,
      })

      // Cluster body — dark disc with a revenue-graded ring (cyan -> green).
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'jobs',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(8,18,33,0.9)',
          'circle-radius': ['step', ['get', 'point_count'], 18, 8, 26, 25, 34],
          'circle-stroke-width': 2,
          'circle-stroke-color': ['interpolate', ['linear'], ['get', 'sum'], 1500, '#0EA5E9', 6000, '#06B6D4', 14000, '#22C55E'],
          'circle-stroke-opacity': 0.9,
        } as never,
      })

      // Cluster label: count + total £ value.
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'jobs',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': [
            'format',
            ['to-string', ['get', 'point_count']],
            { 'font-scale': 1.15 },
            '\n',
            {},
            [
              'case',
              ['>=', ['get', 'sum'], 1000],
              ['concat', '£', ['to-string', ['round', ['/', ['get', 'sum'], 1000]]], 'k'],
              ['concat', '£', ['to-string', ['get', 'sum']]],
            ],
            { 'font-scale': 0.82 },
          ],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-line-height': 1.1,
          'text-allow-overlap': true,
        } as never,
        paint: { 'text-color': '#FFFFFF', 'text-halo-color': 'rgba(6,182,212,0.45)', 'text-halo-width': 0.6 } as never,
      })

      // Urgent pulse halo (animated via transition toggling below).
      map.addLayer({
        id: 'job-pulse',
        type: 'circle',
        source: 'jobs',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'category'], 'urgent']],
        paint: {
          'circle-color': '#EF4444',
          'circle-opacity': 0.32,
          'circle-radius': 9,
          'circle-radius-transition': { duration: 900 },
          'circle-opacity-transition': { duration: 900 },
        } as never,
      })

      // Individual jobs, coloured by category.
      map.addLayer({
        id: 'job-points',
        type: 'circle',
        source: 'jobs',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'category'],
            'airport', CATEGORY_META.airport.color,
            'empty-return', CATEGORY_META['empty-return'].color,
            'cover', CATEGORY_META.cover.color,
            'urgent', CATEGORY_META.urgent.color,
            '#94A3B8',
          ],
          'circle-radius': 6,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(3,7,18,0.9)',
        } as never,
      })

      // Selected job highlight ring.
      map.addLayer({
        id: 'job-selected',
        type: 'circle',
        source: 'jobs',
        filter: ['==', ['get', 'id'], '__none__'],
        paint: {
          'circle-color': 'rgba(0,0,0,0)',
          'circle-radius': 12,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        } as never,
      })

      // Route line (glow + core) for the selected job.
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#06B6D4', 'line-width': 9, 'line-opacity': 0.18, 'line-blur': 4 } as never,
      })
      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#67E8F9', 'line-width': 2.5, 'line-dasharray': [1.5, 1.5] } as never,
      })

      // Interactions ---------------------------------------------------------
      map.on('click', 'clusters', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
        const clusterId = f?.properties?.cluster_id
        const src = map.getSource('jobs') as mapboxgl.GeoJSONSource
        if (clusterId == null || !src) return
        src.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          const geom = f.geometry as GeoJSON.Point
          map.easeTo({ center: geom.coordinates as [number, number], zoom: (zoom ?? map.getZoom()) + 0.3, duration: 600 })
        })
        clusterTapRef.current?.()
      })

      map.on('click', 'job-points', (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined
        if (id) selectRef.current(id)
      })

      // Tap empty map → deselect.
      map.on('click', (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['clusters', 'job-points'] })
        if (!hits.length) selectRef.current(null)
      })

      for (const id of ['clusters', 'job-points']) {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
      }

      // Urgent pulse loop using paint transitions (cheap, GPU-driven).
      let big = false
      const pulse = () => {
        if (!mapRef.current) return
        big = !big
        try {
          map.setPaintProperty('job-pulse', 'circle-radius', big ? 20 : 9)
          map.setPaintProperty('job-pulse', 'circle-opacity', big ? 0 : 0.32)
        } catch {
          /* layer gone */
        }
      }
      const pulseTimer = window.setInterval(pulse, 950)
      map.once('remove', () => window.clearInterval(pulseTimer))

      setReady(true)
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [token])

  // --- update source when jobs / filter change --------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const src = map.getSource('jobs') as mapboxgl.GeoJSONSource | undefined
    src?.setData(jobsGeoJSON(filtered(jobs)) as never)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, filter, ready])

  // --- selected job: draw route + frame it ------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setFilter('job-selected', ['==', ['get', 'id'], selectedId ?? '__none__'])
    const route = map.getSource('route') as mapboxgl.GeoJSONSource | undefined
    const job = selectedId ? jobs.find((j) => j.id === selectedId) : null
    if (job && route) {
      route.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [job.pickup, job.dropoff] },
        properties: {},
      } as never)
      const b = new mapboxgl.LngLatBounds(job.pickup, job.pickup).extend(job.dropoff)
      map.fitBounds(b, { padding: { top: 56, bottom: 50, left: 50, right: 50 }, maxZoom: 10, duration: 700 })
    } else if (route) {
      route.setData({ type: 'FeatureCollection', features: [] } as never)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready])

  // --- resize on demand -------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const run = () => map.resize()
    run()
    const t = window.setTimeout(run, 120)
    window.addEventListener('resize', run)
    window.addEventListener('orientationchange', run)
    const ro = containerRef.current ? new ResizeObserver(run) : null
    if (ro && containerRef.current) ro.observe(containerRef.current)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', run)
      window.removeEventListener('orientationchange', run)
      ro?.disconnect()
    }
  }, [resizeSignal])

  // --- driver location marker + geolocation -----------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const el = document.createElement('div')
    el.style.cssText = 'position:relative;width:30px;height:30px'
    const ring = document.createElement('div')
    ring.className = 'driver-pulse-ring'
    ring.style.cssText = 'position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:9999px;background:rgba(34,197,94,0.35)'
    const arrowWrap = document.createElement('div')
    arrowWrap.style.cssText = 'position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;transition:transform 0.3s ease;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6))'
    arrowWrap.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2.5 L19.5 20.5 L12 16.2 L4.5 20.5 Z" fill="#22C55E" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    el.appendChild(ring)
    el.appendChild(arrowWrap)
    ringRef.current = ring
    arrowWrapRef.current = arrowWrap
    arrowPathRef.current = arrowWrap.querySelector('path')

    const marker = new mapboxgl.Marker({ element: el }).setLngLat(locRef.current ?? DEFAULT_DRIVER).addTo(map)
    markerRef.current = marker

    const onPos = (pos: GeolocationPosition) => {
      const ll: [number, number] = [pos.coords.longitude, pos.coords.latitude]
      locRef.current = ll
      marker.setLngLat(ll)
      // Point the arrow in the direction of travel when we have a heading.
      const h = pos.coords.heading
      if (h != null && !Number.isNaN(h)) {
        headingRef.current = h
        if (arrowWrapRef.current) arrowWrapRef.current.style.transform = `rotate(${h}deg)`
      }
      onLocationRef.current?.(ll)
      if (!firstFix.current) {
        firstFix.current = true
        map.easeTo({ center: ll, zoom: 10, duration: 800 })
      } else if (followRef.current) {
        map.easeTo({ center: ll, duration: 600 })
      }
    }
    const onErr = () => {
      if (!firstFix.current) {
        firstFix.current = true
        locRef.current = DEFAULT_DRIVER
        onLocationRef.current?.(DEFAULT_DRIVER)
      }
    }

    let watchId: number | undefined
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 })
    } else {
      onErr()
    }

    // Panning the map exits Follow Mode (Uber behaviour).
    const onDrag = () => { if (followRef.current) onFollowChangeRef.current?.(false) }
    map.on('dragstart', onDrag)

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId)
      map.off('dragstart', onDrag)
      marker.remove()
      markerRef.current = null
    }
  }, [ready])

  // --- driver status colour ---------------------------------------------------
  useEffect(() => {
    const c = DRIVER_STATUS_COLOR[driverStatus]
    if (arrowPathRef.current) arrowPathRef.current.setAttribute('fill', c)
    if (ringRef.current) ringRef.current.style.background = c + '59'
  }, [driverStatus, ready])

  // --- single-tap recenter ----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || recenterKey === 0) return
    const ll = locRef.current ?? DEFAULT_DRIVER
    map.easeTo({ center: ll, zoom: Math.max(map.getZoom(), 10), duration: 600 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey])

  // --- follow mode toggled on -> snap to driver -------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !follow) return
    const ll = locRef.current
    if (ll) map.easeTo({ center: ll, duration: 500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100%', height: '100%', background: '#030712' }} />
      {!tiles && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 90% at 50% 30%, rgba(6,182,212,0.12), transparent 60%), #030712' }}>
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
    </div>
  )
}
