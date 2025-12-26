/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // CSP headers removed - causing eval blocking issues
  // async headers() { return [] },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl) return []
    return [{ source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' }]
  },
}

module.exports = nextConfig