'use client'

/**
 * Checkout canceled — user left Stripe Checkout without completing.
 * cancel_url can point here or directly to /pricing.
 */

import Link from 'next/link'

export default function CheckoutCancelPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#0B1120', color: '#E2E8F0' }}
    >
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-white mb-2">Checkout canceled</h1>
        <p className="text-sm text-slate-400 mb-6">
          You didn’t complete the upgrade. You can try again whenever you’re ready.
        </p>
        <Link
          href="/pricing"
          className="inline-block px-5 py-2.5 rounded-lg font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
        >
          Back to Pricing
        </Link>
      </div>
    </div>
  )
}
