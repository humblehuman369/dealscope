/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Styles: self + unsafe-inline for Tailwind CSS and inline styles
              "style-src 'self' 'unsafe-inline'",
              // Connections: self + HTTPS for API calls + localhost for dev
              "connect-src 'self' https: wss: http://localhost:* ws://localhost:* http://127.0.0.1:*",
              // Images: allow any source for property photos
              "img-src * data: blob:",
              // Fonts: self + data URIs
              "font-src 'self' data:",
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

module.exports = nextConfig