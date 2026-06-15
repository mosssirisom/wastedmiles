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
    <div className="relative w-full min-h-screen bg-[#09090B] text-[#FAFAFA]" style={{ minHeight: '100dvh' }}>
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] flex items-center gap-2 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm font-medium pl-3 pr-4 py-2 rounded-full shadow-lg hover:bg-[#27272A] transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        <div className="text-center max-w-xl mx-auto">
          <div className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Pricing</div>
          <h1 className="font-playfair italic text-4xl mt-1">Plans that pay for themselves</h1>
          <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">
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
                  ? 'border-[#F97316]/50 bg-[#F97316]/[0.06]'
                  : 'border-[#27272A] bg-[#111113]'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#F97316] text-white text-[10px] font-medium uppercase tracking-wider px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold tracking-[-0.02em]">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums tracking-[-0.03em]">£{tier.price}</span>
                <span className="text-sm text-[#71717A]">/mo</span>
              </div>
              <p className="text-xs text-[#71717A] mt-1">{tier.tagline}</p>

              <ul className="mt-5 space-y-2.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#A1A1AA]">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#A1A1AA]" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={onJoin}
                className={`mt-6 w-full py-2.5 rounded-lg text-sm font-medium transition-colors active:scale-[0.99] ${
                  tier.popular
                    ? 'bg-[#F97316] hover:bg-[#EA580C] text-white'
                    : 'bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#FAFAFA]'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[#71717A] mt-8">
          All plans include verified operator status, secure payments and 24/7 marketplace access.
        </p>
      </div>
    </div>
  )
}
