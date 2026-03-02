/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optional: set turbopack.root to silence "multiple lockfiles" warning in monorepos.
  // Use an absolute path to the frontend directory (e.g. path.resolve(__dirname)).
  // Left unset here because setting it can cause "project directory: .../frontend/src/app" resolution issues in some Next 16 builds.
  // output: 'standalone', // Removed - not needed for Vercel deployment
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + unsafe-inline for Next.js hydration scripts.
              // unsafe-eval is NOT needed for production Next.js builds.
              "script-src 'self' 'unsafe-inline' https://*.sentry.io https://*.sentry-cdn.com https://*.vercel-scripts.com https://*.vercel-insights.com https://vercel.live https://maps.googleapis.com https://*.google.com https://*.gstatic.com https://js.stripe.com",
              // Styles: self + unsafe-inline for Tailwind CSS and inline styles
              // (Google Fonts removed — fonts are self-hosted via next/font)
              "style-src 'self' 'unsafe-inline'",
              // Connections: self + HTTPS for API calls + Sentry + Vercel + Google Maps + Stripe + localhost for dev
              "connect-src 'self' https: wss: http://localhost:* ws://localhost:* http://127.0.0.1:* https://*.sentry.io https://*.vercel-insights.com https://maps.googleapis.com https://*.google.com https://api.stripe.com",
              // Images: allow any source for property photos
              "img-src * data: blob:",
              // Fonts: self + data URIs (Google Fonts no longer needed — self-hosted)
              "font-src 'self' data:",
              // Frames: Stripe uses iframes for 3D Secure and Elements
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              // Prevent embedding in frames (clickjacking protection)
              "frame-ancestors 'none'",
              // Workers for service workers if needed
              "worker-src 'self' blob:",
              // Base URI restriction
              "base-uri 'self'",
              // Form actions
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  },

  async redirects() {
    return [
      // Deprecated routes — server-side 301 redirects (no client-side flash)
      { source: '/landing', destination: '/', permanent: true },
      { source: '/landing2', destination: '/', permanent: true },
      { source: '/analysis-iq', destination: '/verdict', permanent: true },
      { source: '/verdict-iq', destination: '/verdict', permanent: true },
      { source: '/compare', destination: '/price-intel?view=sale', permanent: true },
      { source: '/rental-comps', destination: '/price-intel?view=rent', permanent: true },
    ]
  },

  async rewrites() {
    // Proxy all /api/* requests to the backend.
    //
    // This is CRITICAL for cookie-based auth: when the browser sends
    // requests to dealgapiq.com/api/*, cookies are first-party.
    // Without this, cookies set by the Railway backend are third-party
    // and get blocked by modern browsers.
    //
    // App and backend are both at https://dealgapiq.com. On Vercel, set NEXT_PUBLIC_API_URL to that URL
    // (or leave unset to use it as the default).
    const raw = process.env.NEXT_PUBLIC_API_URL || ''
    const trimmed = raw.trim().replace(/\/+$/, '')
    const canonicalBackend = 'https://dealgapiq.com'
    const apiUrl =
      trimmed || (process.env.VERCEL ? canonicalBackend : 'http://localhost:8000')
    if (process.env.VERCEL) {
      console.log(`[next.config.js] NEXT_PUBLIC_API_URL raw value: "${raw}" (length=${raw.length})`)
      console.log(`[next.config.js] Rewrite destination: ${apiUrl}/api/:path*`)
      const isLocalhost = apiUrl.startsWith('http://localhost') || apiUrl.startsWith('http://127.0.0.1')
      if (trimmed && isLocalhost) {
        throw new Error(
          'NEXT_PUBLIC_API_URL must be your public backend URL on Vercel, not localhost. ' +
          'Set it in Vercel → Project → Settings → Environment Variables (e.g. https://dealgapiq.com), then redeploy.'
        )
      }
      if (!trimmed) {
        console.log(
          '[next.config.js] NEXT_PUBLIC_API_URL not set; using https://dealgapiq.com for API rewrites.'
        )
      }
    }
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig;