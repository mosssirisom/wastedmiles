import { useEffect, useState } from 'react'
import Hero from './components/Hero'
import AreaScreen from './components/AreaScreen'
import SectionScreen, { type SectionKind } from './components/SectionScreen'
import { fetchRegions, type Region } from './data/marketplace'

export default function App() {
  const [regions, setRegions] = useState<Region[]>([])
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKind | null>(null)

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

  const openRegion = (id: string) => {
    setActiveSection(null)
    setActiveRegionId(id)
  }
  const openSection = (s: SectionKind) => {
    setActiveRegionId(null)
    setActiveSection(s)
  }
  const goHome = () => {
    setActiveRegionId(null)
    setActiveSection(null)
  }

  return (
    <div
      className="min-h-screen bg-white tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {activeRegion ? (
        <AreaScreen region={activeRegion} onBack={goHome} />
      ) : activeSection ? (
        <SectionScreen section={activeSection} regions={regions} onBack={goHome} />
      ) : (
        <Hero regions={regions} onSelectRegion={openRegion} onOpenSection={openSection} />
      )}
    </div>
  )
}
