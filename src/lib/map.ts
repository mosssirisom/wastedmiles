import L from 'leaflet'

// Free, no-key tile sources (attribution rendered by Leaflet).
export const SATELLITE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const DARK_TILES =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export const ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics | &copy; ' +
  '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; ' +
  '<a href="https://carto.com/attributions">CARTO</a>'

// Brand-orange teardrop pin for a job, with an active (selected) variant.
export function makeJobIcon(active: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="job-pin${active ? ' job-pin--active' : ''}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}
