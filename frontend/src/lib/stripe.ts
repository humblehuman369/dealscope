import { loadStripe, type Stripe } from '@stripe/stripe-js'

const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

/**
 * stripePromise resolves to a Stripe instance when the publishable key
 * is configured, or null when it's missing (dev mode / CI).
 * Passing an empty string to loadStripe() throws — so we guard here.
 */
export const stripePromise: Promise<Stripe | null> = key
  ? loadStripe(key)
  : Promise.resolve(null)
