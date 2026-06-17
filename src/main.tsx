import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RelayApp from './relay/RelayApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RelayApp />
  </StrictMode>,
)
