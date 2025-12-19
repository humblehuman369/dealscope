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
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; default-src 'self'; connect-src *; img-src * data:; font-src 'self' data:;"
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