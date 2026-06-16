import { useEffect, useState } from 'react'
import Hero from './components/Hero'
import AreaScreen from './components/AreaScreen'
import SectionScreen, { type SectionKind } from './components/SectionScreen'
import OperatorsScreen from './components/OperatorsScreen'
import PricingScreen from './components/PricingScreen'
import JoinScreen from './components/JoinScreen'
import MarketplaceScreen from './components/MarketplaceScreen'
import OperatorProfileScreen from './components/OperatorProfileScreen'
import MyJourneysScreen from './components/MyJourneysScreen'
import MessagesScreen from './components/MessagesScreen'
import ThreadScreen from './components/ThreadScreen'
import NotificationsScreen from './components/NotificationsScreen'
import DashboardScreen from './components/DashboardScreen'
import SignInScreen from './components/SignInScreen'
import AccountScreen from './components/AccountScreen'
import PostJourneyScreen from './components/PostJourneyScreen'
import MyPostedScreen from './components/MyPostedScreen'
import FindWorkScreen from './components/FindWorkScreen'
import BottomNav, { type NavTab } from './components/BottomNav'
import JourneyDetail from './components/JourneyDetail'
import Toaster from './components/Toaster'
import { startNotificationFeed } from './lib/notifications'
import { fetchRegions, OPERATORS, type Region, type Journey } from './data/marketplace'

type View =
  | { kind: 'home' }
  | { kind: 'marketplace'; airport?: string }
  | { kind: 'region'; id: string }
  | { kind: 'section'; section: SectionKind }
  | { kind: 'operators' }
  | { kind: 'operator'; id: string }
  | { kind: 'my-journeys' }
  | { kind: 'messages' }
  | { kind: 'thread'; operatorId: string }
  | { kind: 'notifications' }
  | { kind: 'dashboard' }
  | { kind: 'signin' }
  | { kind: 'account' }
  | { kind: 'post' }
  | { kind: 'posted' }
  | { kind: 'find-work' }
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
    startNotificationFeed()
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
      onOpenMyJourneys={() => setView({ kind: 'my-journeys' })}
      onOpenMessages={() => setView({ kind: 'messages' })}
      onOpenNotifications={() => setView({ kind: 'notifications' })}
      onOpenDashboard={() => setView({ kind: 'dashboard' })}
      onOpenSignIn={() => setView({ kind: 'signin' })}
      onOpenAccount={() => setView({ kind: 'account' })}
      onOpenPost={() => setView({ kind: 'post' })}
      onOpenFindWork={() => setView({ kind: 'find-work' })}
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
        onMessage={(id) => setView({ kind: 'thread', operatorId: id })}
      />
    ) : (
      home
    )
  } else if (view.kind === 'my-journeys') {
    screen = (
      <MyJourneysScreen regions={regions} onBack={goHome} onOpenJourney={setDetailJourney} />
    )
  } else if (view.kind === 'messages') {
    screen = (
      <MessagesScreen
        onBack={goHome}
        onOpenThread={(id) => setView({ kind: 'thread', operatorId: id })}
      />
    )
  } else if (view.kind === 'thread') {
    screen = (
      <ThreadScreen operatorId={view.operatorId} onBack={() => setView({ kind: 'messages' })} />
    )
  } else if (view.kind === 'notifications') {
    screen = <NotificationsScreen onBack={goHome} />
  } else if (view.kind === 'dashboard') {
    screen = <DashboardScreen onBack={goHome} />
  } else if (view.kind === 'signin') {
    screen = <SignInScreen onBack={goHome} onDone={goHome} />
  } else if (view.kind === 'account') {
    screen = (
      <AccountScreen
        onBack={goHome}
        onSignedOut={goHome}
        onOpenPosted={() => setView({ kind: 'posted' })}
      />
    )
  } else if (view.kind === 'post') {
    screen = (
      <PostJourneyScreen
        regions={regions}
        onBack={goHome}
        onPosted={() => setView({ kind: 'posted' })}
      />
    )
  } else if (view.kind === 'posted') {
    screen = <MyPostedScreen onBack={goHome} onPost={() => setView({ kind: 'post' })} />
  } else if (view.kind === 'find-work') {
    screen = <FindWorkScreen onBack={goHome} />
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
        onMessageOperator={(id) => {
          setDetailJourney(null)
          setView({ kind: 'thread', operatorId: id })
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
          onMyJourneys={() => setView({ kind: 'my-journeys' })}
          onMessages={() => setView({ kind: 'messages' })}
          onNotifications={() => setView({ kind: 'notifications' })}
          onDashboard={() => setView({ kind: 'dashboard' })}
          onSignIn={() => setView({ kind: 'signin' })}
          onAccount={() => setView({ kind: 'account' })}
          onPost={() => setView({ kind: 'post' })}
          onPosted={() => setView({ kind: 'posted' })}
          onFindWork={() => setView({ kind: 'find-work' })}
          onPricing={() => setView({ kind: 'pricing' })}
          onJoin={() => setView({ kind: 'join' })}
        />
      )}
    </div>
  )
}

