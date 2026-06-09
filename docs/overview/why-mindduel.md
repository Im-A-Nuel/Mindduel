# Why MindDuel?

Most "Web3 games" are slot machines with extra steps. MindDuel is not.

It is a competitive PvP game where the player who knows more and plays the board better walks away with the pot. No house. No edge. No oracle. No vibes.

## Skill > luck

Tic Tac Toe alone is a solved game — perfect play always draws. That is the whole reason MindDuel adds the trivia gate. The moment a wrong answer can pass your turn, the game gets two layers:

- **Board strategy** — where you play matters.
- **Knowledge depth** — whether you can play matters too.

A weaker board player who knows their crypto trivia can beat a stronger board player. A trivia ace who blunders the board still loses. Both axes are real.

That is the pitch: a game where being smart actually wins.

## Real stakes, real outcomes

Every match has real money in escrow:

- Minimum stake: **0.01 SOL**.
- Both players match the stake; the pot is `2 x stake`.
- Winner takes `pot x 97.5%`. Platform fee: `2.5%`. Draw: 50/50 after fee.

There is no "energy meter." No cooldowns. No grindy daily quests. You stake, you play, you win or lose. That is the whole loop.

## Trustless, not "trust us"

Read this carefully because it is the actual differentiator:

| Concern | How MindDuel handles it |
|---|---|
| Who holds the pot? | Escrow PDA. Program is the only signing authority. |
| Who decides the correct answer? | The chain — via SHA-256 verification of your committed hash. |
| Can the platform tilt outcomes? | No instruction can redirect funds outside settlement. |
| Can the opponent see my answer first? | No — commit-reveal hides it until you reveal. |
| What if the backend goes down? | Your in-progress game still settles on-chain. |

The treasury wallet is hardcoded as a compile-time constant. The fee percentage is hardcoded as a constant. None of it is mutable by an admin key, because there is no admin key.

## On-chain everything that matters

| Lives on-chain | Lives off-chain |
|---|---|
| Stakes, pot, settlement | Trivia question pool |
| Board state, turn order | UI rendering |
| Commit-reveal hash | Leaderboard mirror |
| Hint usage bitmask | WebSocket relay |
| Win/draw/timeout detection | Match history mirror |

If something can be cheated, it is on-chain. If something is just convenience, it can be off-chain.

## Gasless onboarding

First-time Solana players hate "fund a wallet just to try the demo." MindDuel ships with an optional **sponsor wallet** that pays transaction fees on the player's behalf, with hard guards so the sponsor cannot be drained. See [Sponsored Gas](../features/sponsored-gas.md).

You still stake your own SOL — the sponsor only covers the rent and tx fees. But the friction of "I just want to try this" disappears.

## Built for Solana, deliberately

Solana is the only L1 where MindDuel's design works at consumer-grade UX:

| Requirement | Why it matters |
|---|---|
| ~400ms finality | Two on-chain transactions per turn (commit + reveal) feel instant. |
| Sub-cent fees | Per-turn on-chain interaction is not painful. |
| Built-in slot entropy | Shifting Board mode does not need an external VRF. |
| Anchor + wallet-adapter maturity | Solo dev can ship a full game in a hackathon. |

This is not a port. It is a game designed around Solana's strengths.

## Bottom line

MindDuel is a real game. With real stakes. Decided by real skill. Settled by code that nobody can override.

If that sounds fun, go to [Quickstart](./quickstart.md) and play a round.
