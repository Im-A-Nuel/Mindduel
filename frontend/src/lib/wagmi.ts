import { http, createConfig } from 'wagmi'
import { celo } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { CELO_RPC_URL } from './constants'

/**
 * wagmi config for Celo mainnet. A single `injected` connector covers both
 * MiniPay (which injects `window.ethereum`) and desktop wallets like MetaMask.
 */
export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [celo.id]: http(CELO_RPC_URL),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
