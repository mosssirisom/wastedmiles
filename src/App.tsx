import { useEffect, useState } from 'react'
import Hero from './components/Hero'
import AreaScreen from './components/AreaScreen'
import SectionScreen, { type SectionKind } from './components/SectionScreen'
import OperatorsScreen from './components/OperatorsScreen'
import PricingScreen from './components/PricingScreen'
import JoinScreen from './components/JoinScreen'
import BottomNav, { type NavTab } from './components/BottomNav'
import JourneyDetail from './components/JourneyDetail'
import { fetchRegions, type Region, type Journey } from './data/marketplace'

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
  const [detailJourney, setDetailJourney] = useState<Journey | null>(null)

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
      onOpenJourney={setDetailJourney}
    />
  )

  let screen
  if (view.kind === 'region') {
    const region = regions.find((r) => r.id === view.id)
    screen = region ? (
      <AreaScreen region={region} onBack={goHome} onOpenJourney={setDetailJourney} />
    ) : (
      home
    )
  } else if (view.kind === 'section') {
    screen = (
      <SectionScreen
        section={view.section}
        regions={regions}
        onBack={goHome}
        onOpenJourney={setDetailJourney}
      />
    )
  } else if (view.kind === 'operators') {
    screen = <OperatorsScreen onBack={goHome} regions={regions} />
  } else if (view.kind === 'pricing') {
    screen = <PricingScreen onBack={goHome} onJoin={() => setView({ kind: 'join' })} />
  } else if (view.kind === 'join') {
    screen = <JoinScreen onBack={goHome} />
  } else {
    screen = home
  }

  // Bottom tab bar shows on the top-level browse screens only.
  const showNav =
    view.kind === 'home' || view.kind === 'section' || view.kind === 'operators'
  const activeTab: NavTab =
    view.kind === 'section'
      ? view.section
      : view.kind === 'operators'
        ? 'operators'
        : 'market'

  return (
    <div
      className="min-h-screen bg-[#09090B] tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {screen}
      <JourneyDetail journey={detailJourney} onClose={() => setDetailJourney(null)} />
      {showNav && (
        <BottomNav
          active={activeTab}
          onHome={goHome}
          onEmpty={() => setView({ kind: 'section', section: 'empty' })}
          onCover={() => setView({ kind: 'section', section: 'cover' })}
          onOperators={() => setView({ kind: 'operators' })}
          onPricing={() => setView({ kind: 'pricing' })}
          onJoin={() => setView({ kind: 'join' })}
        />
      )}
    </div>
  )
}

