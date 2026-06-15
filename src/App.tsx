import { useState } from 'react'
import Hero from './components/Hero'
import AreaScreen from './components/AreaScreen'
import { TOWNS } from './data/jobs'

export default function App() {
  const [activeTownId, setActiveTownId] = useState<string | null>(null)
  const activeTown = TOWNS.find((t) => t.id === activeTownId) ?? null

  return (
    <div
      className="min-h-screen bg-white tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {activeTown ? (
        <AreaScreen town={activeTown} onBack={() => setActiveTownId(null)} />
      ) : (
        <Hero onSelectTown={setActiveTownId} />
      )}
    </div>
  )
}
