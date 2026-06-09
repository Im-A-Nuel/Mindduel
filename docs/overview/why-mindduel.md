# Why MindDuel?

Most "Web3 games" are slot machines with extra steps. MindDuel is not.

It is a competitive PvP game where the player who knows more and plays the board better climbs the ladder. No house. No edge. No oracle. No money on the line. Just skill, recorded on-chain.

## Skill > luck

Tic Tac Toe alone is a solved game — perfect play always draws. That is the whole reason MindDuel adds the trivia gate. The moment a wrong answer can pass your turn, the game gets two layers:

- **Board strategy** — where you play matters.
- **Knowledge depth** — whether you can play matters too.

A weaker board player who knows their trivia can beat a stronger board player. A trivia ace who blunders the board still loses. Both axes are real.

That is the pitch: a game where being smart actually wins.

## Real competition, no risk

Every ranked match changes where you sit on the ladder — but nothing is wagered:

- You start at **1000 points** and climb or fall from there.
- Ranked uses zero-sum Elo with **K=32**, floored at 0.
- Win and your points go up; your opponent's go down by the same amount. Draws move you toward each other.

There is no stake, no pot, and no payout. There is also no "energy meter," no cooldowns, and no grindy daily quests. You connect, you play, your rank moves. That is the whole loop. Want to play with zero stakes on your record? Choose **Casual** or **vs-AI** — neither is recorded on-chain.

## Trustless, not "trust us"

Read this carefully because it is the actual differentiator:

| Concern | How MindDuel handles it |
|---|---|
| Who owns the rankings? | `MindDuelRanking.sol` on Celo — on-chain and verifiable. |
| Who decides the correct answer? | Commit-reveal — `SHA-256(answer || nonce)` is verified, not an oracle. |
| Can the platform fake a result? | `recordMatch` is owner-only and idempotent per `matchId`, so a result can't be double-counted, and every change is on-chain. |
| Can the opponent see my answer first? | No — commit-reveal hides it until you reveal. |
| Do I have to risk money to play? | No. Nothing is staked, ever. |

## On-chain everything that matters

| Lives on-chain | Lives off-chain |
|---|---|
| Ranked points, rank tiers | Trivia question pool |
| W/L/D records | UI rendering |
| Ranking updates (via relayer) | Board state, turn order |
| | Commit-reveal verification |
| | Leaderboard mirror |
| | WebSocket relay |
| | Match history mirror |

The competitive ladder — the thing that can be cheated or rewritten — lives on-chain. Everything that is just convenience lives off-chain.

## Gasless for players

First-time players hate "fund a wallet just to try the demo." MindDuel needs none of that. Players **never sign a ranking transaction and never pay gas**. A backend **relayer** (the contract owner) submits every ranked result via `recordMatch()` and pays the CELO gas. See [Gasless Ranking](../features/sponsored-gas.md).

You just connect a wallet and play. The friction of "I just want to try this" disappears entirely.

## Built for Celo, deliberately

Celo is the right home for MindDuel's consumer-first design:

| Requirement | Why it matters |
|---|---|
| MiniPay distribution | Auto-connect inside MiniPay puts the game in front of real mobile users. |
| Low, predictable fees | The relayer can sponsor every ranked result cheaply. |
| EVM tooling maturity | Foundry, wagmi, and viem let a solo dev ship a full game in a hackathon. |
| Mainnet-ready | Ranking runs on Celo mainnet (chainId 42220), not a throwaway testnet. |

This is not a port. It is a game designed around Celo's strengths and built for Celo Proof of Ship.

## Bottom line

MindDuel is a real game. With real competition. Decided by real skill. Ranked by code that nobody can quietly rewrite — and you never risk a cent or sign a transaction to climb.

If that sounds fun, go to [Quickstart](./quickstart.md) and play a round.
