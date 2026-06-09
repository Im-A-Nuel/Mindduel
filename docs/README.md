# MindDuel

> Trivia-gated PvP Tic Tac Toe. Pure skill ladder. On-chain ranking. Built on Celo.

MindDuel is a competitive consumer game where two players race to claim board cells by answering trivia questions correctly. Knowledge gates every move. Ranked matches are recorded on-chain on Celo as a pure Elo-style skill ladder — **no staking, no betting, no tokens wagered**. Win and your rank climbs; lose and it drops.

This is the official documentation site. Use the sidebar (or [SUMMARY.md](./SUMMARY.md)) to navigate.

| | |
|---|---|
| **Live App** | [mindduel-frontier.vercel.app](https://mindduel-frontier.vercel.app/) |
| **Demo Video** | [youtu.be/iN9SkfHLoBg](https://youtu.be/iN9SkfHLoBg) (full walkthrough, 2:32) |
| **Backend Health** | [mindduel-production.up.railway.app/health](https://mindduel-production.up.railway.app/health) |
| **Builder** | Im-A-Nuel ([@Im-A-Nuel](https://github.com/Im-A-Nuel)) |
| **Repo** | [github.com/Im-A-Nuel/Mindduel](https://github.com/Im-A-Nuel/Mindduel) |
| **Ranking Contract** | `MindDuelRanking.sol` (Solidity / Foundry) |
| **Network** | Celo Mainnet (chainId 42220, RPC https://forno.celo.org) |
| **Wallet** | MiniPay (auto-connect) or any injected wallet |
| **Built for** | Celo Proof of Ship |

## Where to start

- New player? Read [Quickstart](./overview/quickstart.md) — first match in under two minutes.
- Curious why this exists? See [Problem Statement](./overview/problem-statement.md) and [Why MindDuel?](./overview/why-mindduel.md).
- Builder digging into the tech? Jump straight to [Architecture](./technical/architecture.md) or [Smart Contracts](./technical/smart-contracts.md).
- Looking for modes, hints, or how ranking works? Try [Game Modes](./features/game-modes.md) and [Free Hints](./features/hint-economy.md).

## What makes MindDuel different

- **Skill-gated, not luck-gated.** Every move requires a correct trivia answer.
- **Pure skill ladder.** No money is wagered. Ranked wins raise your on-chain points; losses lower them. Zero-sum Elo, K=32, starting at 1000.
- **Gasless for players.** A backend relayer (the contract owner) submits every ranked result and pays the CELO gas. Players never sign a transaction or pay gas to be ranked.
- **Commit-reveal anti-cheat.** Players commit `SHA-256(answer || nonce)` before revealing. No oracle in the loop.
- **Live modes.** Classic, Shifting Board, Scale Up, Blitz, and vs-AI practice — each rewrites the strategy.
- **MiniPay-ready.** The app auto-connects inside MiniPay and works with any injected wallet on desktop too.

## Try it live

- **Frontend:** [https://mindduel-frontier.vercel.app/](https://mindduel-frontier.vercel.app/)
- **Demo video walkthrough:** [https://youtu.be/iN9SkfHLoBg](https://youtu.be/iN9SkfHLoBg)
- **Backend health probe:** [https://mindduel-production.up.railway.app/health](https://mindduel-production.up.railway.app/health)
- **GitHub:** [https://github.com/Im-A-Nuel/Mindduel](https://github.com/Im-A-Nuel/Mindduel)

Just connect a wallet and play — there is nothing to fund and no transaction to sign. Prefer to watch first? The [demo video](https://youtu.be/iN9SkfHLoBg) shows the full flow end-to-end in under three minutes.
