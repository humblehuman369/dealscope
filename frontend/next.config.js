/** @type {import('next').NextConfig} */

const isCapacitor = process.env.BUILD_TARGET === 'capacitor'

const nextConfig = {
  reactStrictMode: true,

}

if (!isCapacitor) {
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
            "script-src 'self' 'unsafe-inline' https://*.sentry.io https://*.sentry-cdn.com https://*.vercel-scripts.com https://*.vercel-insights.com https://vercel.live https://maps.googleapis.com https://*.google.com https://*.gstatic.com https://js.stripe.com",
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
    { source: '/landing', destination: '/', permanent: true },
    { source: '/landing2', destination: '/', permanent: true },
    { source: '/analysis-iq', destination: '/verdict', permanent: true },
    { source: '/verdict-iq', destination: '/verdict', permanent: true },
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
