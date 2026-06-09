# MindDuel — Celo

**Prove your mind. Climb the ranks.** MindDuel is a trivia-gated PvP Tic-Tac-Toe
duel: to place a mark you must first answer a trivia question correctly. Built
for **Celo Proof of Ship** — no staking, no betting. Ranked matches are a pure
skill ladder recorded **on-chain**: win and your points (and rank) go up, lose
and they go down.

## How it works
- **Connect a wallet** (MiniPay in-app, or any injected wallet on desktop).
- **Play Ranked or Casual.** Ranked PvP results are recorded on Celo mainnet;
  casual and vs-AI matches are just for fun.
- **No gas for players.** A backend relayer (the contract owner) submits each
  ranked result via `recordMatch()` and pays the CELO gas. You never sign a tx
  to be ranked — you just play.
- **Elo ladder.** The `MindDuelRanking` contract keeps each player's points
  (start 1000, K=32), W/L/D and rank tier (Bronze → Master).

## Celo Proof of Ship checklist
- ✅ **MiniPay integration** — `frontend/src/hooks/useMiniPay.ts` auto-connects
  the injected connector when running inside MiniPay (`window.ethereum.isMiniPay`).
- ✅ **Smart contract on Celo mainnet** — `contracts/MindDuelRanking.sol`
  (Foundry). See `contracts/DEPLOY.md`.
- ✅ Shipped, working app (frontend + backend + contract).

## Monorepo layout
```
contracts/   Foundry — MindDuelRanking.sol, tests, deploy script (run in WSL)
backend/     Fastify — matchmaking, trivia, WebSocket sync, Celo relayer
frontend/    Next.js 14 — wagmi + viem, MiniPay, the game UI
```

## Quickstart (local)
Prereqs: Node.js, a Postgres URL (e.g. Neon), and Foundry (in WSL) for the contract.

```bash
# 1. Install JS workspaces
npm install

# 2. Contract (WSL): build + test, then deploy to Celo mainnet
#    see contracts/DEPLOY.md
cd contracts && forge build && forge test

# 3. Backend
cp backend/.env.example backend/.env   # set DATABASE_URL, RANKING_CONTRACT_ADDRESS, RELAYER_PRIVATE_KEY
npm run db:push --workspace=backend
npm run backend                        # http://localhost:3001

# 4. Frontend
cp frontend/.env.example frontend/.env.local   # set NEXT_PUBLIC_RANKING_CONTRACT_ADDRESS etc.
npm run frontend                       # http://localhost:3000
```

> Without `RANKING_CONTRACT_ADDRESS` + `RELAYER_PRIVATE_KEY` the backend runs
> DB-only (matches play, but ranked results aren't written on-chain) — handy for
> local dev.

## On-chain ranking
- Contract: `MindDuelRanking.sol` — `recordMatch(winner, loser, draw, matchId)`
  (owner-only, idempotent per `matchId`), `getPlayer`, paginated `getPlayers`.
- Rating: integer Elo, start **1000**, K=**32**, zero-sum, floored at 0.
- The frontend reads points/rank directly from the contract via viem
  (`frontend/src/lib/contract.ts`); the backend mirrors writes through the
  relayer (`backend/src/lib/chain.ts`).

## Tech
Solidity (Foundry) · Celo mainnet · Next.js 14 · wagmi + viem · MiniPay ·
Fastify · Drizzle + Postgres · WebSockets.

---
Hackathon build. MIT.
