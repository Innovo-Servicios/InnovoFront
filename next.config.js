/** @type {import('next').NextConfig} */
const nextConfig = {
  // Producción y el servidor de desarrollo pueden ejecutarse en paralelo sin
  // sobrescribir sus manifiestos de compilación.
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
