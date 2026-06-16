import { useEffect, useState } from 'react'
import Hero from './components/Hero'
import AreaScreen from './components/AreaScreen'
import SectionScreen, { type SectionKind } from './components/SectionScreen'
import OperatorsScreen from './components/OperatorsScreen'
import PricingScreen from './components/PricingScreen'
import JoinScreen from './components/JoinScreen'
import MarketplaceScreen from './components/MarketplaceScreen'
import OperatorProfileScreen from './components/OperatorProfileScreen'
import BottomNav, { type NavTab } from './components/BottomNav'
import JourneyDetail from './components/JourneyDetail'
import Toaster from './components/Toaster'
import { fetchRegions, OPERATORS, type Region, type Journey } from './data/marketplace'

type View =
  | { kind: 'home' }
  | { kind: 'marketplace'; airport?: string }
  | { kind: 'region'; id: string }
  | { kind: 'section'; section: SectionKind }
  | { kind: 'operators' }
  | { kind: 'operator'; id: string }
  | { kind: 'pricing' }
  | { kind: 'join' }

export default function App() {
  const [regions, setRegions] = useState<Region[]>([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>({ kind: 'home' })
  const [detailJourney, setDetailJourney] = useState<Journey | null>(null)

  useEffect(() => {
    let alive = true
    fetchRegions().then((r) => {
      if (alive) {
        setRegions(r)
        setLoaded(true)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  const goHome = () => setView({ kind: 'home' })

  if (!loaded) {
    return (
      <div
        className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center gap-2"
        style={{ minHeight: '100dvh', fontFamily: "'Inter', sans-serif" }}
      >
        <span className="text-[#FAFAFA] text-2xl font-playfair italic animate-pulse">
          Wasted Miles
        </span>
        <span className="text-xs text-[#71717A]">Loading live network…</span>
      </div>
    )
  }

  const home = (
    <Hero
      regions={regions}
      onSelectRegion={(id) => setView({ kind: 'region', id })}
      onOpenSection={(section) => setView({ kind: 'section', section })}
      onOpenOperators={() => setView({ kind: 'operators' })}
      onOpenPricing={() => setView({ kind: 'pricing' })}
      onOpenJoin={() => setView({ kind: 'join' })}
      onOpenMarketplace={() => setView({ kind: 'marketplace' })}
      onOpenJourney={setDetailJourney}
    />
  )

  let screen
  if (view.kind === 'marketplace') {
    screen = (
      <MarketplaceScreen
        regions={regions}
        initialAirport={view.airport}
        onBack={goHome}
        onOpenJourney={setDetailJourney}
      />
    )
  } else if (view.kind === 'region') {
    const region = regions.find((r) => r.id === view.id)
    screen = region ? (
      <AreaScreen
        region={region}
        onBack={goHome}
        onOpenJourney={setDetailJourney}
        onOpenMarketplace={(id) => setView({ kind: 'marketplace', airport: id })}
      />
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
    screen = (
      <OperatorsScreen
        onBack={goHome}
        regions={regions}
        onOpenOperator={(id) => setView({ kind: 'operator', id })}
      />
    )
  } else if (view.kind === 'operator') {
    const op = OPERATORS[view.id]
    screen = op ? (
      <OperatorProfileScreen
        operator={op}
        regions={regions}
        onBack={() => setView({ kind: 'operators' })}
      />
    ) : (
      home
    )
  } else if (view.kind === 'pricing') {
    screen = <PricingScreen onBack={goHome} onJoin={() => setView({ kind: 'join' })} />
  } else if (view.kind === 'join') {
    screen = <JoinScreen onBack={goHome} />
  } else {
    screen = home
  }

  // Bottom tab bar shows on the top-level browse screens only.
  const showNav =
    view.kind === 'home' ||
    view.kind === 'marketplace' ||
    view.kind === 'section' ||
    view.kind === 'operators'
  const activeTab: NavTab =
    view.kind === 'marketplace'
      ? 'marketplace'
      : view.kind === 'section'
        ? view.section
        : view.kind === 'operators'
          ? 'menu'
          : 'home'

  return (
    <div
      className="min-h-screen bg-[#09090B] tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {screen}
      <Toaster />
      <JourneyDetail
        journey={detailJourney}
        onClose={() => setDetailJourney(null)}
        onOpenOperator={(id) => {
          setDetailJourney(null)
          setView({ kind: 'operator', id })
        }}
      />
      {showNav && (
        <BottomNav
          active={activeTab}
          onHome={goHome}
          onMarketplace={() => setView({ kind: 'marketplace' })}
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

