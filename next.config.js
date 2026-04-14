/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api-backend/:path*',
        destination: `${process.env.BACKEND_INTERNAL_URL || 'http://localhost:30001'}/:path*`,
      },
    ]
  },
}

export default nextConfig
