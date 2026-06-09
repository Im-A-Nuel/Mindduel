# Roadmap

MindDuel is built and maintained by **Im-A-Nuel** ([@im-f-nuel](https://github.com/im-f-nuel)). This page tracks what is shipped, what is in progress, and what is planned next. No fake dates — only phase ordering.

## Phase 1 — MVP (Hackathon Submission)

Live on Solana devnet today.

| Feature | Status |
|---|---|
| Classic Duel mode (3x3) | Live |
| Shifting Board mode (slot-entropy rotation) | Live |
| Scale Up mode (3x3 -> 4x4 -> 5x5) | Live |
| Commit-reveal anti-cheat (`commit_answer` + `reveal_answer`) | Live |
| On-chain hint economy (5 hints, bitmask ledger) | Live |
| Dual-currency staking (SOL + mock USDC) | Live |
| Trustless escrow + 2.5% fee on settlement | Live |
| Tournament brackets (4 / 8 player) | Live |
| Leaderboard, match history, badge system | Live |
| Sponsor wallet for gasless onboarding | Live |
| Real-time WebSocket relay + Solana account-subscribe | Live |
| Spectator mode (read-only) | Live |
| vs-AI practice mode | Live |

## Phase 2 — In progress

| Feature | Status |
|---|---|
| Blitz mode (5-minute on-chain timer per turn) | In progress |
| Epic Game soulbound NFT (Metaplex Umi) for `drama_score >= 80` matches | In progress |
| Pre-match category selection | Planned |

## Phase 3 — Planned

| Feature | Status |
|---|---|
| Mainnet deployment | Planned |
| Ultimate TTT mode (9x9 meta-grid) | Planned |
| React Native mobile app | Planned |
| Larger tournament brackets (16 / 32 players) | Planned |
| Sponsored prize-pool tournaments | Planned |
| `$MDUEL` governance token (gated to verified Epic Game holders) | Planned |
| Progressive AI difficulty rating for practice mode | Planned |

## What is NOT on the roadmap

A few deliberate omissions, listed for clarity:

- **In-game currency or "energy" system.** The whole game runs on real SOL/USDC. No grind loops.
- **Lootboxes or randomized rewards.** Drama-score Epic Game NFTs are earned, not pulled from a box.
- **Pay-to-win cosmetics that affect gameplay.** Cosmetic skins might happen later, but they will never alter mechanics.
- **An admin key.** The treasury is hardcoded, the fee percentage is hardcoded, escrow withdrawal paths are hardcoded. There is no upgradeable governance escape hatch.

## How to influence the roadmap

This is a single-builder project. The fastest way to ship something on the roadmap is to:

1. Open an issue at [github.com/im-f-nuel/MinDDuel](https://github.com/im-f-nuel/MinDDuel) describing the use case.
2. If you can implement it, send a PR. Solo project velocity rewards contributors.
3. Demos that show real player demand (twitch clips, screenshot threads, tournament results) bump priorities faster than feature requests.

## Contact

Reach out via the repo issues or discussions tab. Builder handle: [@im-f-nuel](https://github.com/im-f-nuel).
