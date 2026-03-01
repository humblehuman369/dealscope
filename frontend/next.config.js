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
    // On Vercel, set NEXT_PUBLIC_API_URL to your public backend URL (e.g. https://your-app.up.railway.app).
    // If unset, we fall back to localhost and API rewrites will 404 until you add the var and redeploy.
    const raw = process.env.NEXT_PUBLIC_API_URL || ''
    const apiUrl = raw.trim().replace(/\/+$/, '') || 'http://localhost:8000'
    if (process.env.VERCEL) {
      console.log(`[next.config.js] NEXT_PUBLIC_API_URL raw value: "${raw}" (length=${raw.length})`)
      console.log(`[next.config.js] Rewrite destination: ${apiUrl}/api/:path*`)
      const isLocalhost = apiUrl.startsWith('http://localhost') || apiUrl.startsWith('http://127.0.0.1')
      if (raw && isLocalhost) {
        throw new Error(
          'NEXT_PUBLIC_API_URL must be your public backend URL on Vercel, not localhost. ' +
          'Set it in Vercel → Project → Settings → Environment Variables (e.g. https://your-app.up.railway.app), then redeploy.'
        )
      }
      if (!raw) {
        console.warn(
          '[next.config.js] NEXT_PUBLIC_API_URL is not set on Vercel. API rewrites will target localhost and may 404. ' +
          'Add NEXT_PUBLIC_API_URL in Vercel → Settings → Environment Variables, then redeploy.'
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