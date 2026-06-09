/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // wagmi's connector barrel pulls in MetaMask/WalletConnect/Coinbase SDKs that
  // optionally require React-Native / Node-only modules we never use on web
  // (we only use the `injected` connector). Stub them so the bundle builds
  // clean without "Module not found" noise.
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      lokijs: false,
      encoding: false,
    }
    return config
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
