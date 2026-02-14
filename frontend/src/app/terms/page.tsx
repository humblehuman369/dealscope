'use client'

import Link from 'next/link'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
            &larr; Back to RealVestIQ
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: February 13, 2026</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using RealVestIQ (&ldquo;the Service&rdquo;), operated by RealVestIQ LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              RealVestIQ provides real estate investment analytics tools, including property analysis across multiple investment strategies, deal scoring, price target calculations, and related features. The Service is available via web application and mobile application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Not Financial Advice</h2>
            <p className="font-semibold text-amber-400/90">
              RealVestIQ is an analytics tool, not a financial advisor, lender, or real estate broker. The information provided by the Service is for informational and educational purposes only and does not constitute financial, investment, legal, or tax advice.
            </p>
            <p className="mt-3">
              You should consult qualified professionals before making any investment decisions. We make no guarantees about the accuracy, completeness, or timeliness of any data, calculations, or recommendations provided by the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. User Accounts</h2>
            <p>
              To access certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You agree to provide accurate, current, and complete information during registration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Scrape, crawl, or use automated means to access the Service without permission</li>
              <li>Redistribute, resell, or sublicense access to the Service</li>
              <li>Misrepresent your identity or affiliation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Sources & Accuracy</h2>
            <p>
              RealVestIQ aggregates data from third-party sources including public records, MLS feeds, and proprietary APIs. While we strive for accuracy, data may be incomplete, delayed, or contain errors. Property values, rental estimates, and market conditions are approximations and should not be relied upon as the sole basis for investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service — including text, graphics, logos, algorithms, and software — are owned by RealVestIQ LLC and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, RealVestIQ LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or business opportunities arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated terms on this page with a revised date. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
            <p>
              For questions about these Terms, contact us at{' '}
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
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
