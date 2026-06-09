# Smart Contracts

| | |
|---|---|
| **Program ID** | `8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN` |
| **Network** | Solana Devnet |
| **Framework** | Anchor 0.30 (Rust) |
| **Instructions** | 15 total (9 SOL + 6 USDC variants) |
| **Treasury** | `CPoofbZho4bJmSAyVJxfeMK9CoZpXpDYftctghwUJX86` (compile-time constant) |

The program is the single custodian of player funds and the only authority that can write game state. Funds can only leave escrow via `settle_game`, `cancel_match`, or `resign_game` (and their USDC counterparts).

## Account schemas

### GameAccount

PDA seeds: `["game", player_one.pubkey]`. ~196 bytes.

| Field | Type | Notes |
|---|---|---|
| `player_one` | `Pubkey` | Creator, plays as X |
| `player_two` | `Pubkey` | Joiner, plays as O |
| `status` | `GameStatus` | `WaitingForPlayer` / `Active` / `Finished` / `Cancelled` |
| `mode` | `GameMode` | `Classic` / `ShiftingBoard` / `ScaleUp` / `Blitz` |
| `board` | `[CellState; 25]` | Flat 5x5; only `board_size^2` cells active |
| `board_size` | `u8` | `3`, `4`, or `5` |
| `current_turn` | `Pubkey` | Whose move it is |
| `stake_per_player` | `u64` | Lamports (SOL) or base units (USDC) |
| `pot_lamports` | `u64` | Total in escrow |
| `committed_hash` | `[u8; 32]` | Pending commit; zeroed between turns |
| `committed_cell` | `u8` | Target cell of pending commit |
| `last_action_ts` | `i64` | Unix timestamp |
| `round` | `u8` | Increments each turn |
| `drama_score` | `u8` | +5 per turn, capped at 100; >= 80 = Epic Game |
| `bump`, `escrow_bump` | `u8` | PDA bumps |
| `currency` | `Currency` | `Sol` or `MockUsdc` |

### HintLedger

PDA seeds: `["hint", game.pubkey, player.pubkey]`. ~74 bytes. `init_if_needed`.

| Field | Type | Notes |
|---|---|---|
| `game` | `Pubkey` | |
| `player` | `Pubkey` | |
| `used_hints` | `u8` | Bitmask: bit 0 EliminateTwo, bit 1 CategoryReveal, bit 2 ExtraTime, bit 3 FirstLetter, bit 4 Skip |
| `bump` | `u8` | |

## Instructions

| Instruction | Purpose | PDA seeds touched |
|---|---|---|
| `initialize_game` | Create SOL match, lock player_one's stake in escrow | `["game", player_one]`, `["escrow", game]` |
| `join_game` | Player two joins SOL match, locks matching stake | `["game", ...]`, `["escrow", ...]` |
| `commit_answer` | Store `SHA-256(answer || nonce)` and target cell on-chain | `["game", ...]` |
| `reveal_answer` | Verify hash, place mark, apply mode mutation, switch turn | `["game", ...]` |
| `claim_hint` | Buy SOL hint; 80% to treasury, 20% to escrow; bitmask in hint_ledger | `["hint", game, player]`, `["escrow", ...]` |
| `settle_game` | Distribute SOL pot after win / draw / timeout; close GameAccount | `["game", ...]`, `["escrow", ...]` |
| `timeout_turn` | Any signer can switch turn after `last_action_ts + timeout` | `["game", ...]` |
| `cancel_match` | Refund SOL stake while in `WaitingForPlayer` | `["game", ...]`, `["escrow", ...]` |
| `resign_game` | Concede active SOL game; opponent receives `pot - fee` | `["game", ...]`, `["escrow", ...]` |
| `initialize_game_usdc` | USDC variant: creates escrow ATA, transfers from player_one ATA | ATA of `["escrow", game]` |
| `join_game_usdc` | USDC variant: transfers stake from player_two ATA | escrow ATA |
| `claim_hint_usdc` | USDC variant of `claim_hint` | hint_ledger + escrow ATA |
| `settle_game_usdc` | USDC variant of `settle_game` | escrow ATA |
| `cancel_match_usdc` | USDC variant of `cancel_match` | escrow ATA |
| `resign_game_usdc` | USDC variant of `resign_game` | escrow ATA |

## Critical instruction details

### `commit_answer` constraints

- `game.status == Active`
- `game.current_turn == player.key()`
- `game.committed_hash == [0u8; 32]` (no existing commit)
- `cell_index < board_size^2` and target cell is `Empty`

### `reveal_answer` flow

1. Verify `SHA-256([answer_index, ...nonce]) == committed_hash`.
2. Zero out `committed_hash` (replay protection).
3. If `answer_index != 255` and not Blitz-timed-out: place X or O at `committed_cell`.
4. Apply mode mutation:
   - `ShiftingBoard`: rotate board every 3rd round in direction `Clock::get()?.slot % 4`.
   - `ScaleUp`: grow to 4x4 at `round >= 4`, to 5x5 at `round >= 9`.
5. Switch `current_turn`, increment `round` and `drama_score`, update `last_action_ts`.
6. Emit `AnswerRevealed` event.

`answer_index = 255` is the explicit "wrong" sentinel — hash still verified, no piece placed.

### `settle_game` requires one of

| Condition | Description |
|---|---|
| Winner found | `determine_winner` returns Some |
| Board full | All `board_size^2` cells non-empty |
| Turn timed out | `now - last_action_ts >= timeout` (24h Classic, 300s Blitz) |

Otherwise fails with `MindDuelError::GameStillActive`. Stops a losing player from settling early to grab a draw split.

## Constants reference

```rust
PLATFORM_FEE_BPS             = 250        // 2.5%
BPS_DENOMINATOR              = 10_000
HINT_TREASURY_BPS            = 8_000      // 80%
HINT_PRIZE_BPS               = 2_000      // 20%
TURN_TIMEOUT_SECS            = 86_400     // 24 hours
BLITZ_TIMEOUT_SECS           = 300        // 5 minutes
EPIC_DRAMA_THRESHOLD         = 80

HINT_ELIMINATE_TWO_LAMPORTS  = 2_000_000  // 0.002 SOL
HINT_CATEGORY_LAMPORTS       = 1_000_000  // 0.001 SOL
HINT_EXTRA_TIME_LAMPORTS     = 3_000_000  // 0.003 SOL
HINT_FIRST_LETTER_LAMPORTS   = 1_000_000  // 0.001 SOL
HINT_SKIP_LAMPORTS           = 5_000_000  // 0.005 SOL

GAME_SEED    = b"game"
HINT_SEED    = b"hint"
ESCROW_SEED  = b"escrow"
```

## Error codes

| Code | Name | Meaning |
|---|---|---|
| 6000 | `InvalidGameState` | Game is not in expected state for this instruction |
| 6001 | `NotYourTurn` | Caller is not `current_turn` |
| 6002 | `HashMismatch` | Reveal hash != committed hash |
| 6003 | `InvalidCellIndex` | Cell index out of bounds for board size |
| 6004 | `CellOccupied` | Target cell already occupied |
| 6005 | `NoCommitFound` | Reveal called without prior commit |
| 6006 | `CommitAlreadyExists` | Commit called while one is pending |
| 6007 | `TurnNotTimedOut` | Timeout window not yet reached |
| 6008 | `InsufficientFunds` | Not enough SOL for selected hint |
| 6009 | `HintAlreadyUsed` | Hint type already purchased this game |
| 6010 | `StakeTooLow` | Below minimum 0.01 SOL |
| 6011 | `GameAlreadyFull` | Player two already joined |
| 6012 | `GameStillActive` | Settle called too early |
| 6013 | `Unauthorized` | Wrong signer or wrong treasury address |
| 6014 | `Overflow` | Arithmetic overflow in fee or distribution math |

## Events

| Event | Fields | Emitted by |
|---|---|---|
| `GameCreated` | `game, player_one, stake_amount, mode` | `initialize_game` |
| `AnswerRevealed` | `game, player, cell_index, correct` | `reveal_answer` |
| `GameSettled` | `game, winner_mark (Option<bool>), pot, fee` | `settle_game` |

`winner_mark`: `Some(true)` = X won, `Some(false)` = O won, `None` = draw.

## Security model (summary)

- **Hardcoded treasury.** `TREASURY_PUBKEY` is a compile-time `pubkey!` constant. Every fee-paying instruction has `constraint = treasury.key() == TREASURY_PUBKEY`.
- **Replay protection.** `committed_hash` is zeroed at the start of `reveal_answer`, so the same `(answer, nonce)` pair cannot be reused on subsequent turns.
- **Turn enforcement.** Both `commit_answer` and `reveal_answer` require `current_turn == player.key()`.
- **Early-settle prevention.** `settle_game` requires a real terminal condition.
- **One active game per wallet.** `GameAccount` PDA seeded with `player_one` — `init` fails if it already exists.
