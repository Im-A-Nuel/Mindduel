# Problem Statement

On-chain gaming on Solana today splits into two unsatisfying buckets:

1. **Pure chance** — coin flips, lotteries, slot-style mechanics. Outcomes are random. Skill is irrelevant.
2. **Speculation** — NFT flip mechanics, token rugs dressed up as games. The "play" is buying and selling, not actually playing.

Meanwhile, real-money trivia games already exist on Web2 — HQ Trivia, quiz apps, knowledge betting platforms. They prove there is a real audience for skill-based, knowledge-driven games with money on the line. But every single one of them is fully centralized:

- The operator decides what counts as a correct answer.
- The operator holds the prize pool.
- The operator can shut down, exit-scam, or quietly tilt outcomes.
- Players have no way to verify any of it.

## The gap

There is no on-chain, provably fair, skill-based game on Solana where:

| Property | Web2 Trivia | On-chain Coinflip | MindDuel |
|---|---|---|---|
| Skill matters | Yes | No | Yes |
| Trustless escrow | No | Yes | Yes |
| No oracle in the loop | N/A | Yes | Yes |
| Real PvP (not vs house) | Sometimes | Rarely | Yes |
| Verifiable outcomes | No | Yes | Yes |

## Why this matters for Solana

Solana's pitch to consumers is "fast, cheap, and good enough for real-time apps." Sub-second finality and sub-cent fees make per-turn on-chain interaction practical for the first time. But most Solana games still feel like web2 games with a wallet glued on — the game logic runs on a server, only the payouts touch chain.

That defeats the point. If a player has to trust the operator to run the game fairly, the chain is only being used as a payment rail. We can do better.

## What MindDuel proves

- Game logic, escrow, settlement, and anti-cheat can all live on-chain.
- A consumer game can avoid centralized oracles entirely by using commit-reveal.
- A solo developer can ship a complete competitive game on Solana in a hackathon timeframe using mature tooling (Anchor, wallet-adapter, Fastify, Drizzle).

The next page lays out the [Solution](./solution.md).
