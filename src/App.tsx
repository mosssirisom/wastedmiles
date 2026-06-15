import { useEffect, useState } from 'react'
import Hero from './components/Hero'
import AreaScreen from './components/AreaScreen'
import { fetchTowns, type Town } from './data/jobs'

export default function App() {
  const [towns, setTowns] = useState<Town[]>([])
  const [activeTownId, setActiveTownId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchTowns().then((t) => {
      if (alive) setTowns(t)
    })
    return () => {
      alive = false
    }
  }, [])

  const activeTown = towns.find((t) => t.id === activeTownId) ?? null

  return (
    <div
      className="min-h-screen bg-white tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {activeTown ? (
        <AreaScreen town={activeTown} onBack={() => setActiveTownId(null)} />
      ) : (
        <Hero towns={towns} onSelectTown={setActiveTownId} />
      )}
    </div>
  )
}
