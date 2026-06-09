# Game Modes

MindDuel ships with three live modes and two more on the roadmap. Every mode uses the same trivia gate, escrow, and settlement logic — only the board behavior changes.

## Mode comparison

| Mode | Status | Board | Twist | Turn timeout |
|---|---|---|---|---|
| **Classic Duel** | Live | 3x3 | Pure baseline. Win with 3 in a row. | 24 hours |
| **Shifting Board** | Live | 3x3 | Entire board rotates every 3 rounds via slot entropy. | 24 hours |
| **Scale Up** | Live | 3x3 -> 4x4 -> 5x5 | Board grows as correct answers accumulate. | 24 hours |
| **Blitz** | Phase 2 | 3x3 | 5-minute on-chain timer per turn. | 5 minutes |
| **Ultimate TTT** | Stretch | 9x9 meta-grid | Each cell of the meta-grid is itself a TTT board. | TBD |

A practice mode (`vs-ai`) also exists for free, no-stake play. AI logic runs entirely in the frontend; results are stored as practice matches and excluded from the main leaderboard.

## Classic Duel

The cleanest version of the game.

- 3x3 board, standard alignment rules: 3 in a row horizontally, vertically, or diagonally.
- If all 9 cells fill with no winner, the pot splits 50/50 (after fee).
- Inactive turn after 24 hours -> any signer can call `timeout_turn` to flip the turn.

Best mode for first-time players.

## Shifting Board

The board itself becomes a threat.

- Starts as a 3x3 game.
- Every 3 rounds, the entire board rotates one of four directions:

| `slot % 4` | Direction |
|---|---|
| 0 | Rows shift down (top wraps to bottom) |
| 1 | Rows shift up |
| 2 | Columns shift right |
| 3 | Columns shift left |

- The shift direction is `Clock::get()?.slot % 4` — deterministic, observable on-chain, no oracle needed.
- Pieces keep their owners after a shift. A near-win can suddenly disappear; a scattered opponent's pieces can suddenly form a line.

You have to play one move ahead of the next rotation. This is the most strategically rich mode.

## Scale Up

The arena grows as the match heats up.

- Starts at 3x3. Win condition stays "3 in a row" at all sizes.
- After **round 4**, the board expands to 4x4. Existing pieces are preserved in the top-left quadrant; new cells are empty.
- After **round 9**, the board expands to 5x5. Same expansion logic.
- The on-chain `board` field is a flat `[CellState; 25]`. The active dimension lives in `board_size`.
- The win-detection algorithm slides a 3-cell window over every row, column, and diagonal — works identically at every size.

## Blitz (Phase 2)

For players who want it decisive and fast.

- Each turn has a hard **5-minute (300 second) on-chain timeout** instead of 24 hours.
- If a reveal is submitted after the 300-second window, the program treats it as a wrong answer: the hash is cleared, no piece is placed, the turn passes.
- `timeout_turn` becomes the cleanup tool when an opponent rage-quits or zones out.

## Ultimate TTT (Stretch)

A 9x9 meta-grid where each cell of the outer grid is itself a 3x3 TTT board. Win the inner game to claim the outer cell. Win three outer cells in a row to win the match.

This requires a redesigned `GameAccount` layout and a separate set of instructions. Tracked under V2.0 on the [Roadmap](../resources/roadmap.md).

## How a mode is selected

The mode is chosen at match creation and stored on-chain in `GameAccount.mode`. The contract enforces the mode-specific logic in `reveal_answer` — the frontend cannot lie about which mode is active.

Frontend mode IDs map to on-chain enums as follows:

| Frontend ID | On-chain enum |
|---|---|
| `classic` | `GameMode::Classic` |
| `shifting` | `GameMode::ShiftingBoard` |
| `scaleup` | `GameMode::ScaleUp` |
| `blitz` | `GameMode::Blitz` |
| `vs-ai` | (off-chain only) |
