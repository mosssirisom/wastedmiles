import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'
import './index.css'
import RelayApp from './relay/RelayApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RelayApp />
  </StrictMode>,
)
