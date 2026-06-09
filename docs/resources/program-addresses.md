# Contract Addresses

Everything you need to verify MindDuel on-chain on Celo, plus the live deployment URLs.

## Network

| | |
|---|---|
| **Chain** | Celo mainnet |
| **Chain ID** | `42220` |
| **RPC** | `https://forno.celo.org` |
| **Explorer** | [Celoscan](https://celoscan.io) |

## MindDuelRanking

The single on-chain contract: the points & ranking ledger. No staking, no escrow, no treasury — it stores per-player Elo points only. Owned by the backend relayer, which is the only address that can record results.

| | |
|---|---|
| **Contract** | `MindDuelRanking` |
| **Address** | `0x…` *(set after deploy)* |
| **Network** | Celo mainnet (chainId `42220`) |
| **Framework** | Foundry (solc `0.8.24`) |
| **Explorer** | `https://celoscan.io/address/<addr>` |

> Replace `<addr>` / `0x…` with the deployed address. Example link format:
> `https://celoscan.io/address/0x0000000000000000000000000000000000000000`

## Configuration

After deploying, wire the address into both workspaces:

| Variable | Where | Purpose |
|---|---|---|
| `RANKING_CONTRACT_ADDRESS` | backend | Contract the relayer writes to / reads |
| `RELAYER_PRIVATE_KEY` | backend | Contract owner key (pays CELO gas) |
| `CELO_RPC_URL` | backend | Defaults to `https://forno.celo.org` |
| `NEXT_PUBLIC_RANKING_CONTRACT_ADDRESS` | frontend | Read-only contract reads |
| `NEXT_PUBLIC_CELO_RPC_URL` | frontend | Celo RPC for the public client |

If the backend address / relayer key are unset (local dev), the app runs DB-only with no on-chain settlement.

## Verifying on-chain

Read the contract directly with `cast` (Foundry, run via WSL):

```bash
# A player's record (points, wins, losses, draws, lastPlayed, exists)
cast call <addr> "getPlayer(address)" <player> --rpc-url https://forno.celo.org

# Number of ranked players
cast call <addr> "playerCount()" --rpc-url https://forno.celo.org

# Paginated roster for the leaderboard
cast call <addr> "getPlayers(uint256,uint256)" 0 50 --rpc-url https://forno.celo.org
```

Or browse the contract, its transactions, and `MatchRecorded` events on Celoscan at `https://celoscan.io/address/<addr>`.

## Deployment URLs

| | |
|---|---|
| **Frontend** | *(set after deploy — e.g. Vercel)* |
| **Backend** | *(set after deploy)* |
| **Backend health** | `/health` |
