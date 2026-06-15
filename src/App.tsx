import { useEffect, useState } from 'react'
import Hero from './components/Hero'
import AreaScreen from './components/AreaScreen'
import SectionScreen, { type SectionKind } from './components/SectionScreen'
import OperatorsScreen from './components/OperatorsScreen'
import PricingScreen from './components/PricingScreen'
import JoinScreen from './components/JoinScreen'
import { fetchRegions, type Region } from './data/marketplace'

type View =
  | { kind: 'home' }
  | { kind: 'region'; id: string }
  | { kind: 'section'; section: SectionKind }
  | { kind: 'operators' }
  | { kind: 'pricing' }
  | { kind: 'join' }

export default function App() {
  const [regions, setRegions] = useState<Region[]>([])
  const [view, setView] = useState<View>({ kind: 'home' })

  useEffect(() => {
    let alive = true
    fetchRegions().then((r) => {
      if (alive) setRegions(r)
    })
    return () => {
      alive = false
    }
  }, [])

  const goHome = () => setView({ kind: 'home' })

  const home = (
    <Hero
      regions={regions}
      onSelectRegion={(id) => setView({ kind: 'region', id })}
      onOpenSection={(section) => setView({ kind: 'section', section })}
      onOpenOperators={() => setView({ kind: 'operators' })}
      onOpenPricing={() => setView({ kind: 'pricing' })}
      onOpenJoin={() => setView({ kind: 'join' })}
    />
  )

  let screen
  if (view.kind === 'region') {
    const region = regions.find((r) => r.id === view.id)
    screen = region ? <AreaScreen region={region} onBack={goHome} /> : home
  } else if (view.kind === 'section') {
    screen = <SectionScreen section={view.section} regions={regions} onBack={goHome} />
  } else if (view.kind === 'operators') {
    screen = <OperatorsScreen onBack={goHome} />
  } else if (view.kind === 'pricing') {
    screen = <PricingScreen onBack={goHome} onJoin={() => setView({ kind: 'join' })} />
  } else if (view.kind === 'join') {
    screen = <JoinScreen onBack={goHome} />
  } else {
    screen = home
  }

  return (
    <div
      className="min-h-screen bg-white tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {screen}
    </div>
  )
}

