import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_OG_IMAGE } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Privacy Policy — DealGapIQ',
  description:
    'How DealGapIQ collects, uses, and protects your information when you use our real-estate investment analysis platform.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy — DealGapIQ',
    description: 'How DealGapIQ collects, uses, and protects your information.',
    url: '/privacy',
    type: 'article',
    images: [BRAND_OG_IMAGE],
  },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            &larr; Back to DealGapIQ
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: September 9, 2026</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="mb-3">
              We collect information you provide directly and information collected automatically:
            </p>
            <h3 className="font-semibold text-slate-200 mt-4 mb-2">Information You Provide</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Account information (name, email, password)</li>
              <li>Investment preferences (experience level, strategies, budget, target markets)</li>
              <li>Business profile information (optional)</li>
              <li>Property searches and saved properties</li>
              <li>Feedback and support communications</li>
              <li>
                Mobile phone number and SMS opt-in / consent records, if you choose to receive text
                messages from DealGapIQ
              </li>
            </ul>
            <h3 className="font-semibold text-slate-200 mt-4 mb-2">
              Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Device information (browser type, operating system, device model)</li>
              <li>Usage data (pages visited, features used, search queries)</li>
              <li>Location data (when using the mobile scan feature, with your permission)</li>
              <li>IP address and approximate location</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Provide, maintain, and improve the Service</li>
              <li>Personalize your analytics experience based on your investment preferences</li>
              <li>Process property searches and generate investment analyses</li>
              <li>Send service-related communications (account verification, security alerts)</li>
              <li>Respond to support requests</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Third-Party Data Services</h2>
            <p>
              To provide property analytics and app functionality, we use third-party service
              providers including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-300">RentCast</strong> — Rental estimates, property
                data, and market statistics
              </li>
              <li>
                <strong className="text-slate-300">AXESSO</strong> — Property listings, valuations,
                and market data
              </li>
              <li>
                <strong className="text-slate-300">RapidAPI</strong> — Marketplace gateway for
                property listings, valuations, and market data sourced from Redfin and Realtor.com
              </li>
              <li>
                <strong className="text-slate-300">AirROI</strong> — Short-term rental revenue,
                nightly rate, and occupancy analytics
              </li>
              <li>
                <strong className="text-slate-300">Google Maps</strong> — Mapping and geocoding
                services
              </li>
              <li>
                <strong className="text-slate-300">RevenueCat</strong> — In-app purchase management
                and subscription processing on mobile platforms
              </li>
              <li>
                <strong className="text-slate-300">Stripe</strong> — Payment processing for web
                subscriptions
              </li>
              <li>
                <strong className="text-slate-300">Apple Sign In</strong> — Authentication via Apple
                ID (name and email only, per your authorization)
              </li>
              <li>
                <strong className="text-slate-300">Google Sign In</strong> — Authentication via
                Google account (name, email, and profile picture)
              </li>
            </ul>
            <p className="mt-3">
              Your property searches are sent to data providers to retrieve relevant data. Payment
              processors receive only the information necessary to process transactions. We do not
              sell your personal information to these or any other third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. SMS privacy</h2>
            <p className="mb-3">
              By opting in, you agree to receive customer support, account assistance, and
              inquiry-response SMS messages from DealGapIQ. Message frequency varies. Message and
              data rates may apply. Reply STOP to opt out, HELP for help.
            </p>
            <p className="mb-3">
              No mobile information will be shared with third parties or affiliates for marketing or
              promotional purposes.
            </p>
            <p className="mb-3">
              Text messaging originator opt-in data and consent will not be shared with any third
              parties, except aggregators and providers needed to deliver SMS messages.
            </p>
            <p className="mb-3">
              We do not transfer, share, or disclose consumer SMS registration data or consent
              records to any external organization, except as required to provide the messaging
              service or comply with the law.
            </p>
            <p className="mb-3">
              We use access controls, employee and contractor restrictions, and monitoring
              procedures to prevent unauthorized sharing of user data.
            </p>
            <p>
              For questions about these SMS messages, contact us at{' '}
              <a
                href="mailto:support@dealgapiq.com"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                support@dealgapiq.com
              </a>{' '}
              or{' '}
              <a href="tel:+18663888222" className="text-sky-400 hover:text-sky-300 underline">
                (866) 388-8222
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. SMS opt-out</h2>
            <p className="mb-3">
              Users may opt out of SMS communications at any time. Reply STOP.
            </p>
            <p className="mb-3">Reply HELP or contact{' '}
              <a
                href="mailto:support@dealgapiq.com"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                support@dealgapiq.com
              </a>.
            </p>
            <p>
              For questions about these SMS messages, contact us at{' '}
              <a
                href="mailto:support@dealgapiq.com"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                support@dealgapiq.com
              </a>{' '}
              or{' '}
              <a href="tel:+18663888222" className="text-sky-400 hover:text-sky-300 underline">
                (866) 388-8222
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Storage & Security</h2>
            <p>
              We use industry-standard security measures including encryption in transit (TLS/SSL)
              and at rest to protect your data. Your account credentials are hashed and salted. We
              store data on secure cloud infrastructure with regular backups.
            </p>
            <p className="mt-3">
              While we take reasonable steps to protect your information, no method of transmission
              over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Search history and
              saved properties are retained to provide you with ongoing analytics. You may delete
              your account and all associated data at any time from your Profile settings (Account
              tab), or by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="mt-3">
              You can delete your account directly from the app via Profile → Account → Delete
              Account. This permanently removes all your data including saved properties, search
              history, and profile information. You may also contact us at{' '}
              <a
                href="mailto:support@dealgapiq.com"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                support@dealgapiq.com
              </a>{' '}
              to exercise any of these rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We may also use
              analytics cookies to understand how the Service is used. You can control cookie
              settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 18. We do not knowingly
              collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of material changes
              by posting the updated policy on this page with a revised date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Contact</h2>
            <p>
              For questions about this Privacy Policy or these SMS messages, contact us at{' '}
              <a
                href="mailto:support@dealgapiq.com"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                support@dealgapiq.com
              </a>{' '}
              or{' '}
              <a href="tel:+18663888222" className="text-sky-400 hover:text-sky-300 underline">
                (866) 388-8222
              </a>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>&copy; 2026 DealGapIQ. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-slate-300 transition-colors">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
