# Solution

MindDuel is **trivia-gated PvP Tic Tac Toe on Celo**. Two players race to claim cells on a board, and every move requires a correct trivia answer. Wrong answer? The turn passes. Knowledge plus board strategy decides the winner. **No staking, no betting, no tokens wagered** — ranked matches are a pure skill ladder.

There are two paths through a match:

- **Ranked PvP** — the result is recorded on-chain and changes both players' ranks.
- **Casual and vs-AI** — just for fun. Nothing is recorded.

## The four pillars

### 1. On-chain skill ladder (no money at risk)

Ranked results are written to `MindDuelRanking.sol`, a Solidity contract deployed with Foundry on Celo mainnet. It stores each player's points (integer Elo, starting at 1000, K=32, zero-sum, floored at 0), their W/L/D record, and their rank tier. Winning a ranked match raises your points and lowers your opponent's by the same amount; draws nudge both toward each other. Nothing is staked, and nothing is paid out — the only thing on the line is your rank.

Rank tiers by points:

| Tier | Points |
|---|---|
| Bronze | 0+ |
| Silver | 1000+ |
| Gold | 1200+ |
| Platinum | 1400+ |
| Diamond | 1600+ |
| Master | 1850+ |

### 2. Gasless for players

Players never sign a ranking transaction or hold any CELO. When a ranked match ends, a backend **relayer** — which is the contract owner — calls `recordMatch(winner, loser, draw, matchId)` and pays the CELO gas itself. The call is owner-only and idempotent per `matchId`, so the same result can never be double-counted. Players just connect a wallet and play.

### 3. Commit-reveal anti-cheat (no oracle needed)

The classic problem with on-chain trivia: how do you check the answer without a trusted server telling the chain "yes, that was correct"? Most games use a centralized oracle. MindDuel does not.

The flow:

1. The player picks an answer locally.
2. The client computes `SHA-256(answer || nonce)` (a random 32-byte nonce) and commits it.
3. After the commit confirms, the player reveals the raw answer and nonce.
4. The game verifies that the hash matches the original commitment.

The trivia backend never learns which answer the player picked, and has zero influence on whether a piece gets placed. The commitment is the verifier.

### 4. Live game modes

| Mode | Twist |
|---|---|
| **Classic** | Standard 3x3. Pure baseline. |
| **Shifting Board** | Every few rounds, the entire board rotates. |
| **Scale Up** | Board grows 3x3 -> 4x4 -> 5x5 as correct answers accumulate. Same win condition (3 in a row) at every size. |
| **Blitz** | Fast per-turn timer. |
| **vs-AI** | Practice against the computer. |

See the [Roadmap](../resources/roadmap.md) for what is planned next.

### Bonus: free hints

Hints are **free**, capped at 3 per match. There is no paid hint economy. See [Free Hints](../features/hint-economy.md).

## What is on-chain vs off-chain

| Concern | Where it lives |
|---|---|
| Ranked points, W/L/D, rank tier | `MindDuelRanking.sol` (on-chain, Celo) |
| Board state, turn, current commitment | Backend + clients (off-chain) |
| Hint usage tracking | Match state (off-chain) |
| Win/draw detection | Game logic (off-chain) |
| Trivia question pool | Backend (off-chain, stateless) |
| Match metadata for leaderboard / history | Postgres (off-chain mirror) |
| Real-time UI sync | WebSocket relay (off-chain transport) |
| Ranking transactions | Relayer pays gas, writes on-chain |

The on-chain layer is the single source of truth for the competitive ladder. Everything else is the convenience layer that runs the live game.
