import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
            &larr; Back to RealVestIQ
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: February 13, 2026</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect information you provide directly and information collected automatically:</p>
            <h3 className="font-semibold text-slate-200 mt-4 mb-2">Information You Provide</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Account information (name, email, password)</li>
              <li>Investment preferences (experience level, strategies, budget, target markets)</li>
              <li>Business profile information (optional)</li>
              <li>Property searches and saved properties</li>
              <li>Feedback and support communications</li>
            </ul>
            <h3 className="font-semibold text-slate-200 mt-4 mb-2">Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Device information (browser type, operating system, device model)</li>
              <li>Usage data (pages visited, features used, search queries)</li>
              <li>Location data (when using the mobile scan feature, with your permission)</li>
              <li>IP address and approximate location</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
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
              To provide property analytics, we use third-party data providers including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li><strong className="text-slate-300">RentCast</strong> — Rental estimates, property data, and market statistics</li>
              <li><strong className="text-slate-300">AXESSO</strong> — Property listings, valuations, and market data</li>
              <li><strong className="text-slate-300">Google Maps</strong> — Mapping and geocoding services</li>
            </ul>
            <p className="mt-3">
              Your property searches are sent to these services to retrieve relevant data. We do not sell your personal information to these or any other third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Storage & Security</h2>
            <p>
              We use industry-standard security measures including encryption in transit (TLS/SSL) and at rest to protect your data. Your account credentials are hashed and salted. We store data on secure cloud infrastructure with regular backups.
            </p>
            <p className="mt-3">
              While we take reasonable steps to protect your information, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Search history and saved properties are retained to provide you with ongoing analytics. You may request deletion of your data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
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
              To exercise these rights, contact us at{' '}
              <a href="mailto:support@realvestiq.com" className="text-sky-400 hover:text-sky-300 underline">
                support@realvestiq.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We may also use analytics cookies to understand how the Service is used. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of material changes by posting the updated policy on this page with a revised date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Contact</h2>
            <p>
              For questions about this Privacy Policy, contact us at{' '}
              <a href="mailto:support@realvestiq.com" className="text-sky-400 hover:text-sky-300 underline">
                support@realvestiq.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>&copy; 2026 RealVestIQ LLC. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
