# Solution

MindDuel is **trivia-gated PvP Tic Tac Toe on Solana**. Two players stake real SOL or USDC, then race to claim cells on a board. Every move requires a correct trivia answer. Wrong answer? The turn passes. Knowledge plus board strategy decides the winner.

The smart contract is the entire backend for anything that matters:

- It holds the escrow.
- It validates every move.
- It verifies the commit-reveal hash.
- It distributes the pot at settlement.

## The four pillars

### 1. Trustless escrow

Both players stake into a program-derived address (PDA). Funds can only leave through `settle_game`, `cancel_match`, or `resign_game` (and their USDC variants). Nobody — not the platform, not the developers, not the opponent — has a key that can move escrow funds outside those instructions.

### 2. Commit-reveal anti-cheat (no oracle needed)

The classic problem with on-chain trivia: how do you check the answer without a trusted server telling the chain "yes, that was correct"? Most games use a centralized oracle. MindDuel does not.

The flow:

1. The player picks an answer locally.
2. The client computes `SHA-256([answer_index, ...32-byte nonce])` and submits it on-chain via `commit_answer`.
3. After the commit confirms, the player calls `reveal_answer` with the raw answer and nonce.
4. The program recomputes the hash with `solana_program::hash::hash` and checks it matches the commitment.

The trivia backend never learns which answer the player picked, and has zero influence on whether a piece gets placed. The chain is the verifier.

### 3. Three live game modes

| Mode | Twist |
|---|---|
| **Classic Duel** | Standard 3x3. Pure baseline. |
| **Shifting Board** | Every 3 rounds, the entire board rotates. Direction is `Clock::get()?.slot % 4` — deterministic from chain state. |
| **Scale Up** | Board grows 3x3 -> 4x4 -> 5x5 as correct answers accumulate. Same win condition (3 in a row) at every size. |

Two more are planned: [**Blitz**](../features/game-modes.md) (5-minute on-chain timer per turn) and **Ultimate TTT** (9x9 meta-grid). See the [Roadmap](../resources/roadmap.md).

### 4. On-chain hint micro-economy

Five purchasable hints, each priced 0.001-0.005 SOL. Every hint splits 80% to the platform treasury and 20% back into the active match's pot — so spending hints actually grows the prize you are competing for. Each hint type can only be bought once per player per game (enforced by a bitmask on a `HintLedger` PDA).

See [Hint Economy](../features/hint-economy.md) for the full price list.

## What is on-chain vs off-chain

| Concern | Where it lives |
|---|---|
| Player funds | Escrow PDA (on-chain) |
| Board state, turn, current commitment | GameAccount PDA (on-chain) |
| Hint usage tracking | HintLedger PDA (on-chain) |
| Win/draw/timeout detection | Anchor program (on-chain) |
| Trivia question pool | Backend (off-chain, stateless) |
| Match metadata for leaderboard / history | Postgres (off-chain mirror) |
| Real-time UI sync | WebSocket relay (off-chain transport) |

If the backend disappears, in-progress games still settle correctly on-chain. The backend is a convenience layer — never a trust assumption.
