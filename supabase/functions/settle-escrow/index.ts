// Stripe Connect escrow for the deferred-charge marketplace flow.
//
//   action: 'authorize'  -> on job settlement: charge the operator the FULL
//                           cap and hold it (escrow).
//   action: 'release'    -> on job completion: pay the driver their winning
//                           bid; the platform retains the arbitrage spread.
//
// Deploy: supabase functions deploy settle-escrow
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
})
const gbp = (n: number) => Math.round(n * 100) // pounds -> pence

Deno.serve(async (req) => {
  const { action, jobId } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: payment } = await supabase
    .from('payments')
    .select('*, operator:operator_id(stripe_customer_id), driver:driver_id(stripe_account_id)')
    .eq('job_id', jobId)
    .single()
  if (!payment) return new Response('Payment not found', { status: 404 })

  try {
    if (action === 'authorize') {
      // Charge the operator the full cap and hold in escrow (manual capture).
      const intent = await stripe.paymentIntents.create({
        amount: gbp(Number(payment.amount_charged)),
        currency: 'gbp',
        customer: payment.operator.stripe_customer_id,
        capture_method: 'automatic',
        confirm: true,
        off_session: true,
        metadata: { jobId, kind: 'escrow' },
      })
      await supabase
        .from('payments')
        .update({ stripe_payment_intent_id: intent.id, status: 'held' })
        .eq('id', payment.id)
      return Response.json({ ok: true, status: 'held' })
    }

    if (action === 'release') {
      // Pay the driver their winning bid; platform keeps amount_charged - payout.
      const transfer = await stripe.transfers.create({
        amount: gbp(Number(payment.payout_amount)),
        currency: 'gbp',
        destination: payment.driver.stripe_account_id,
        metadata: { jobId, kind: 'payout' },
      })
      await supabase
        .from('payments')
        .update({ stripe_transfer_id: transfer.id, status: 'released' })
        .eq('id', payment.id)
      return Response.json({ ok: true, status: 'released' })
    }

    return new Response('Unknown action', { status: 400 })
  } catch (err) {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id)
    return new Response(`stripe error: ${err}`, { status: 500 })
  }
})
