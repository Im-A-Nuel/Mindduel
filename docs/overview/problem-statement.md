# Problem Statement

On-chain gaming today splits into two unsatisfying buckets:

1. **Pure chance** — coin flips, lotteries, slot-style mechanics. Outcomes are random. Skill is irrelevant.
2. **Speculation** — NFT flip mechanics, token rugs dressed up as games. The "play" is buying and selling, not actually playing.

And the moment a game *does* involve real money on the line, it asks players to risk funds before they can have fun. Real-money trivia games already exist on Web2 — HQ Trivia, quiz apps, knowledge betting platforms. They prove there is a real audience for skill-based, knowledge-driven games. But every single one of them is fully centralized:

- The operator decides what counts as a correct answer.
- The operator owns the rankings and can rewrite them.
- The operator can shut down, exit-scam, or quietly tilt outcomes.
- Players have no way to verify any of it.

## The gap

There is no provably fair, skill-based game where a competitive ladder is:

| Property | Web2 Trivia | On-chain Coinflip | MindDuel |
|---|---|---|---|
| Skill matters | Yes | No | Yes |
| No money at risk | Sometimes | No | Yes |
| No oracle in the loop | N/A | Yes | Yes |
| Real PvP (not vs house) | Sometimes | Rarely | Yes |
| Verifiable, on-chain ranking | No | N/A | Yes |

## Why this matters for Celo

Celo is built for real consumers — mobile-first, low fees, and MiniPay putting a wallet in millions of pockets. That makes it the right home for a game that wants to reach players who have never touched a "transaction." But most consumer chains still gate play behind funding a wallet and signing transactions.

MindDuel removes both. There is nothing to stake, and players never sign or pay for anything. Ranking is the only thing that touches the chain, and a relayer pays for that.

## What MindDuel proves

- A competitive ranking ladder can live on-chain, transparent and tamper-resistant, with no money wagered.
- A consumer game can avoid centralized oracles entirely by using commit-reveal.
- Players can be ranked on-chain without ever signing a transaction or holding gas, thanks to a gasless relayer.
- A solo developer can ship a complete competitive game on Celo in a hackathon timeframe using mature tooling (Foundry, wagmi/viem, Fastify, Drizzle).

The next page lays out the [Solution](./solution.md).
