/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  poweredByHeader: false, // Seguridad: Ocultar header X-Powered-By
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://backend:8000/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
