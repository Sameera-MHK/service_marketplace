import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

function ensureStripe() {
  if (!stripe) throw new Error('Stripe not configured (STRIPE_SECRET_KEY missing)');
  return stripe;
}

export async function createConsultationPaymentIntent({ amount, currency, metadata = {} }) {
  const s = ensureStripe();
  const toMinor = (v) => Math.round(Number(v) * 100);

  const intent = await s.paymentIntents.create({
    amount:   toMinor(amount),
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata,
  });
  return { id: intent.id, clientSecret: intent.client_secret };
}

export async function retrievePaymentIntent(paymentIntentId) {
  const s = ensureStripe();
  return s.paymentIntents.retrieve(paymentIntentId);
}

export async function refundPaymentIntent(paymentIntentId) {
  const s = ensureStripe();
  return s.refunds.create({ payment_intent: paymentIntentId });
}

export function constructWebhookEvent(rawBody, signature) {
  const s = ensureStripe();
  return s.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
