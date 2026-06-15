import { useEffect, useState } from 'react'
import Hero from './components/Hero'
import AreaScreen from './components/AreaScreen'
import { fetchRegions, type Region } from './data/marketplace'

export default function App() {
  const [regions, setRegions] = useState<Region[]>([])
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchRegions().then((r) => {
      if (alive) setRegions(r)
    })
    return () => {
      alive = false
    }
  }, [])

  const activeRegion = regions.find((r) => r.id === activeRegionId) ?? null

  return (
    <div
      className="min-h-screen bg-white tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {activeRegion ? (
        <AreaScreen region={activeRegion} onBack={() => setActiveRegionId(null)} />
      ) : (
        <Hero regions={regions} onSelectRegion={setActiveRegionId} />
      )}
    </div>
  )
}
