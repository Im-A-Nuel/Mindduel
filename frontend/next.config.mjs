/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Block clickjacking via iframe embed.
          { key: 'X-Frame-Options',        value: 'DENY' },
          // Stop browsers MIME-sniffing scripts/styles.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak the full URL to other origins.
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          // Block opt-in features the app doesn't need.
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
