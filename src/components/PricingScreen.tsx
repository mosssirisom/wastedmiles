import { ArrowLeft, Check } from 'lucide-react'

interface Tier {
  name: string
  price: number
  tagline: string
  features: string[]
  cta: string
  popular?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Solo',
    price: 49,
    tagline: 'For independent drivers',
    features: [
      'Claim available journeys',
      'Empty return matching',
      'Up to 20 journeys / month',
      'Standard support',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Operator',
    price: 149,
    tagline: 'For growing operators',
    popular: true,
    features: [
      'Everything in Solo',
      'Post & broadcast journeys',
      'Emergency cover requests',
      'Unlimited journeys',
      'Operator reputation profile',
      'Priority support',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Fleet',
    price: 299,
    tagline: 'For established networks',
    features: [
      'Everything in Operator',
      'Multi-driver dispatch',
      'Team accounts & roles',
      'Revenue & dead-mile analytics',
      'Dedicated account manager',
      'API access',
    ],
    cta: 'Talk to sales',
  },
]

interface PricingScreenProps {
  onBack: () => void
  onJoin: () => void
}

export default function PricingScreen({ onBack, onJoin }: PricingScreenProps) {
  return (
    <div className="relative w-full min-h-screen bg-black text-white" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-white/90 backdrop-blur text-gray-900 text-sm font-semibold pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-white transition"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        <div className="text-center max-w-xl mx-auto">
          <div className="text-[#e8702a] text-xs font-semibold uppercase tracking-wider">Pricing</div>
          <h1 className="font-playfair italic text-4xl mt-1">Plans that pay for themselves</h1>
          <p className="text-white/60 text-sm mt-2">
            One recovered empty return covers your month. Cancel anytime — billed monthly,
            no setup fees.
          </p>
        </div>

        <div className="grid gap-4 mt-10 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                tier.popular
                  ? 'border-[#e8702a]/60 bg-[#e8702a]/[0.06]'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#e8702a] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-medium">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums">£{tier.price}</span>
                <span className="text-sm text-white/50">/mo</span>
              </div>
              <p className="text-xs text-white/50 mt-1">{tier.tagline}</p>

              <ul className="mt-5 space-y-2.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#e8702a]" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={onJoin}
                className={`mt-6 w-full py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.99] ${
                  tier.popular
                    ? 'bg-[#e8702a] hover:bg-[#d2611f] text-white hover:shadow-lg hover:shadow-[#e8702a]/30'
                    : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/40 mt-8">
          All plans include verified operator status, secure payments and 24/7 marketplace access.
        </p>
      </div>
    </div>
  )
}
