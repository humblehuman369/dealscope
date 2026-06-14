/** @type {import('next').NextConfig} */

const isCapacitor = process.env.BUILD_TARGET === 'capacitor'

const nextConfig = {
  reactStrictMode: true,

  // Turbopack is default in Next 16. We keep a webpack performance budget,
  // so we must explicitly declare an empty turbopack config to avoid conflict.
  turbopack: {},

  // ── Bundle Budget & Performance Hints ─────────────────────────────
  // Warn when any chunk exceeds ~250 kB (gzipped). This helps keep the
  // main bundle lean for mobile (target: < 200 kB initial JS on 3G).
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.performance = {
        ...config.performance,
        maxEntrypointSize: 250000, // 250 kB
        maxAssetSize: 250000,
        hints: 'warning',
      }
    }
    return config
  },

}

if (!isCapacitor) {
  // React's dev build calls eval() to reconstruct cross-environment callstacks
  // (and Turbopack/HMR also need it), so dev mode requires 'unsafe-eval' in the
  // CSP script-src. Production builds never use eval, so we keep it out of the
  // prod CSP to maintain the stricter policy.
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = [
    "script-src 'self' 'unsafe-inline'",
    isDev && "'unsafe-eval'",
    'https://*.sentry.io https://*.sentry-cdn.com https://*.vercel-scripts.com https://*.vercel-insights.com https://vercel.live https://maps.googleapis.com https://*.google.com https://*.gstatic.com https://js.stripe.com https://eu.i.posthog.com https://eu-assets.i.posthog.com',
  ].filter(Boolean).join(' ')

  nextConfig.headers = async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            scriptSrc,
            "style-src 'self' 'unsafe-inline'",
            "connect-src 'self' https: wss: http://localhost:* ws://localhost:* http://127.0.0.1:* https://*.sentry.io https://*.vercel-insights.com https://maps.googleapis.com https://*.google.com https://api.stripe.com",
            "img-src * data: blob:",
            "font-src 'self' data:",
            "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
            "frame-ancestors 'none'",
            "worker-src 'self' blob:",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
  ]

  nextConfig.redirects = async () => [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.dealgapiq.com' }],
      destination: 'https://dealgapiq.com/:path*',
      permanent: true,
    },
    { source: '/', has: [{ type: 'query', key: 'action', value: 'analyze' }], destination: '/search', permanent: true },
    { source: '/landing', destination: '/', permanent: true },
    { source: '/landing2', destination: '/', permanent: true },
    { source: '/verdict', destination: '/discovery', permanent: true },
    { source: '/analysis-iq', destination: '/discovery', permanent: true },
    { source: '/verdict-iq', destination: '/discovery', permanent: true },
    { source: '/compare', destination: '/price-intel?view=sale', permanent: true },
    { source: '/rental-comps', destination: '/price-intel?view=rent', permanent: true },
  ]

  nextConfig.rewrites = async () => {
    const rawBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
    const trimmed = rawBackend.trim().replace(/\/+$/, '')
    const canonicalBackend = 'https://dealscope-production.up.railway.app'
    const apiUrl =
      trimmed || (process.env.VERCEL ? canonicalBackend : 'http://localhost:8000')
    if (process.env.VERCEL) {
      console.log(`[next.config.js] BACKEND_URL/NEXT_PUBLIC_API_URL raw value: "${rawBackend}" (length=${rawBackend.length})`)
      console.log(`[next.config.js] Rewrite destination: ${apiUrl}/api/:path*`)
      const isLocalhost = apiUrl.startsWith('http://localhost') || apiUrl.startsWith('http://127.0.0.1')
      if (trimmed && isLocalhost) {
        throw new Error(
          'BACKEND_URL/NEXT_PUBLIC_API_URL must be your public backend URL on Vercel, not localhost. ' +
          'Set it in Vercel → Project → Settings → Environment Variables (e.g. https://dealscope-production.up.railway.app), then redeploy.'
        )
      }
      if (!trimmed) {
        console.log(
          '[next.config.js] BACKEND_URL/NEXT_PUBLIC_API_URL not set; using Railway backend fallback for API rewrites.'
        )
      }
    }
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ]
  }
}

module.exports = nextConfig
