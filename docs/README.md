# MindDuel

> Trivia-gated PvP Tic Tac Toe. Real SOL stakes. Fully on-chain. Built on Solana.

MindDuel is a competitive consumer game where two players lock real SOL or USDC into a trustless escrow, then race to claim board cells by answering trivia questions correctly. Knowledge gates every move. The smart contract is the referee.

This is the official documentation site. Use the sidebar (or [SUMMARY.md](./SUMMARY.md)) to navigate.

| | |
|---|---|
| **Live App** | [mindduel-frontier.vercel.app](https://mindduel-frontier.vercel.app/) |
| **Demo Video** | [youtu.be/iN9SkfHLoBg](https://youtu.be/iN9SkfHLoBg) (full walkthrough, 2:32) |
| **Backend Health** | [mindduel-production.up.railway.app/health](https://mindduel-production.up.railway.app/health) |
| **Builder** | Im-A-Nuel ([@im-f-nuel](https://github.com/im-f-nuel)) |
| **Repo** | [github.com/im-f-nuel/MinDDuel](https://github.com/im-f-nuel/MinDDuel) |
| **Program ID** | `8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN` |
| **Solana Explorer** | [View deployed program](https://explorer.solana.com/address/8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN?cluster=devnet) |
| **Network** | Solana Devnet |
| **Hackathon** | Colosseum Frontier 2026 — 100xDevs Track |

## Where to start

- New player? Read [Quickstart](./overview/quickstart.md) — first match in under two minutes.
- Curious why this exists? See [Problem Statement](./overview/problem-statement.md) and [Why MindDuel?](./overview/why-mindduel.md).
- Builder digging into the tech? Jump straight to [Architecture](./technical/architecture.md) or [Smart Contracts](./technical/smart-contracts.md).
- Looking for fees, modes, or hint costs? Try [Game Modes](./features/game-modes.md) and [Hint Economy](./features/hint-economy.md).

## What makes MindDuel different

- **Skill-gated, not luck-gated.** Every move requires a correct trivia answer.
- **Trustless escrow.** No operator can touch the pot. Settlement is enforced by the program.
- **Commit-reveal anti-cheat.** Players commit `SHA-256(answer || nonce)` before revealing. No oracle in the loop.
- **Three live modes.** Classic, Shifting Board, Scale Up — each rewrites the strategy.
- **Gasless onboarding.** A sponsor wallet can pay tx fees so first-time players never need devnet SOL.

## Try it live

- **Frontend:** [https://mindduel-frontier.vercel.app/](https://mindduel-frontier.vercel.app/)
- **Demo video walkthrough:** [https://youtu.be/iN9SkfHLoBg](https://youtu.be/iN9SkfHLoBg)
- **Backend health probe:** [https://mindduel-production.up.railway.app/health](https://mindduel-production.up.railway.app/health)
- **GitHub:** [https://github.com/im-f-nuel/MinDDuel](https://github.com/im-f-nuel/MinDDuel)
- **Solana Explorer (devnet program):** [view program](https://explorer.solana.com/address/8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN?cluster=devnet)

Switch your wallet to Solana Devnet, grab some devnet SOL, and you are ready to play. Prefer to watch first? The [demo video](https://youtu.be/iN9SkfHLoBg) shows the full flow end-to-end in under three minutes.
