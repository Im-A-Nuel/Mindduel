# Game Modes

MindDuel ships with several modes. Every ranked mode uses the same trivia gate and the same on-chain ranking settlement — only the board behavior changes. Nothing is wagered: a ranked win moves your points up, a loss moves them down.

## Mode comparison

| Mode | Status | Board | Twist | Answer timing |
|---|---|---|---|---|
| **Classic Duel** | Live | 3x3 | Pure baseline. Win with 3 in a row. | Standard |
| **Shifting Board** | Live | 3x3 | Rows/columns shift every 3 rounds. | Standard |
| **Scale Up** | Live | 3x3 -> 4x4 -> 5x5 | Board grows as correct answers accumulate. | Standard |
| **Blitz** | Live | 3x3 | 5-second answer window per question. | 5 seconds |

A practice mode (`vs-ai`) also exists for free, casual play. AI logic runs in the frontend; vs-AI matches are practice only and are **never ranked** — they do not affect your on-chain points.

## Classic Duel

The cleanest version of the game.

- 3x3 board, standard alignment rules: 3 in a row horizontally, vertically, or diagonally.
- If all 9 cells fill with no winner, the match is a draw.
- In a ranked Classic Duel, a win raises your points and a loss lowers them (a draw nudges both toward each other).

Best mode for first-time players.

## Shifting Board

The board itself becomes a threat.

- Starts as a 3x3 game.
- Every 3 rounds, the entire board shifts one of four directions:

| Shift | Direction |
|---|---|
| 0 | Rows shift down (top wraps to bottom) |
| 1 | Rows shift up |
| 2 | Columns shift right |
| 3 | Columns shift left |

- Pieces keep their owners after a shift. A near-win can suddenly disappear; a scattered opponent's pieces can suddenly form a line.

You have to play one move ahead of the next rotation. This is the most strategically rich mode.

## Scale Up

The arena grows as the match heats up.

- Starts at 3x3. Win condition stays "3 in a row" at all sizes.
- As correct answers accumulate, the board expands to 4x4 and then 5x5. Existing pieces are preserved; new cells are empty.
- The win-detection algorithm slides a 3-cell window over every row, column, and diagonal — works identically at every size.

## Blitz

For players who want it decisive and fast.

- Each question has a hard **5-second answer window** instead of the standard timing.
- If you do not answer in time, it counts as a miss: no piece is placed and the turn passes.
- Blitz rewards instant recall — there is no room to deliberate.

## How a mode is selected

The mode is chosen at match creation. The match runs that mode's board logic for both players. The frontend exposes the modes through these IDs:

| Frontend ID | Mode |
|---|---|
| `classic` | Classic Duel |
| `shifting` | Shifting Board |
| `scaleup` | Scale Up |
| `blitz` | Blitz |
| `vs-ai` | Practice (never ranked) |
