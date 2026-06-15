import L from 'leaflet'
import type { JourneyStatus } from '../data/marketplace'

// Free, no-key tile sources (attribution rendered by Leaflet).
export const SATELLITE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const DARK_TILES =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export const ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics | &copy; ' +
  '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; ' +
  '<a href="https://carto.com/attributions">CARTO</a>'

export const DARK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; ' +
  '<a href="https://carto.com/attributions">CARTO</a>'

// Status-coloured journey marker, with an active (selected) variant.
export function makeJourneyIcon(status: JourneyStatus, active = false) {
  return L.divIcon({
    className: '',
    html: `<div class="journey-pin journey-pin--${status}${active ? ' journey-pin--active' : ''}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}
