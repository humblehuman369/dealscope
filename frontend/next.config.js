/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + unsafe-inline for Next.js hydration, unsafe-eval for dynamic imports/code splitting
              // Added Sentry, Vercel analytics, Google Maps, and common CDNs
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://*.sentry-cdn.com https://*.vercel-scripts.com https://*.vercel-insights.com https://vercel.live https://maps.googleapis.com https://*.google.com https://*.gstatic.com",
              // Styles: self + unsafe-inline for Tailwind CSS and inline styles + Google Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Connections: self + HTTPS for API calls + Sentry + Vercel + Google Maps + localhost for dev
              "connect-src 'self' https: wss: http://localhost:* ws://localhost:* http://127.0.0.1:* https://*.sentry.io https://*.vercel-insights.com https://maps.googleapis.com https://*.google.com",
              // Images: allow any source for property photos
              "img-src * data: blob:",
              // Fonts: self + data URIs + Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
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

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl) return []
    return [{ source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' }]
  },
}

module.exports = nextConfig;