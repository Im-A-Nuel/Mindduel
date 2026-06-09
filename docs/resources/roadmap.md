# Roadmap

This page tracks what is shipped, what is in progress, and what is planned next for MindDuel on Celo. No fake dates — only phase ordering. There is no token and no staking; ranked play is a pure on-chain skill ladder.

## Phase 1 — MVP

Live on Celo mainnet.

| Feature | Status |
|---|---|
| Classic Duel mode (3x3) | Live |
| Shifting Board mode | Live |
| Scale Up mode (3x3 -> 4x4 -> 5x5) | Live |
| Server-side commit-reveal anti-cheat (SHA-256) | Live |
| On-chain points & ranking ledger (`MindDuelRanking`) | Live |
| Relayer-recorded ranked PvP (players pay no gas) | Live |
| Integer Elo rating (start 1000, K=32, zero-sum) | Live |
| Contract-verified leaderboard, match history, badges | Live |
| MiniPay auto-connect + injected wallet support | Live |
| Real-time WebSocket relay (board sync + spectators) | Live |
| Spectator mode (read-only) | Live |
| vs-AI practice mode | Live |
| Matchmaking queue + private join codes | Live |
| Tournament brackets | Live |

## Phase 2 — In progress

| Feature | Status |
|---|---|
| On-chain seasons (periodic rating resets with archived snapshots) | In progress |
| Blitz mode (timed turns) | In progress |
| Pre-match category selection refinements | Planned |
| Richer profile pages (rating history, head-to-head) | Planned |

## Phase 3 — Planned

| Feature | Status |
|---|---|
| Additional game modes (e.g. larger meta-grids) | Planned |
| Deeper MiniPay-native UX (one-tap rematch, share-to-play) | Planned |
| Verified-contract leaderboard widgets / embeds | Planned |
| Larger tournament brackets | Planned |
| Progressive AI difficulty rating for practice mode | Planned |
| React Native / mobile-first client | Planned |

## What is NOT on the roadmap

A few deliberate omissions, listed for clarity:

- **No token.** There is no governance or utility token. Ranking is points-only.
- **No staking or betting.** Ranked matches never put value at risk — they move Elo points, nothing else.
- **No in-game currency or "energy" system.** No grind loops.
- **No lootboxes or randomized rewards.** Badges are earned, not pulled from a box.
- **No pay-to-win.** Cosmetic skins might happen later, but they will never alter mechanics.

## Design principles

- **Players never pay gas.** The relayer records ranked results on Celo; the frontend only reads the contract.
- **The contract is the source of truth.** Points, wins, losses, and draws live on-chain and are independently verifiable on Celoscan.
- **Idempotent settlement.** Each match is recorded exactly once, even on retries.
