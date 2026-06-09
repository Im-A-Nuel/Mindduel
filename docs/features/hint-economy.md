# Hint Economy

Buying a hint costs real lamports. 80% of every hint fee goes to the platform treasury; **20% is added to the active match's escrow** — boosting the winner's payout. Hints are a calculated risk, not a pay-to-win lever.

## The hints

| Hint | SOL price | USDC price | Effect |
|---|---|---|---|
| **Eliminate 2** | 0.002 SOL | 0.40 USDC | Two wrong answer indices are revealed in the UI |
| **Category Reveal** | 0.001 SOL | 0.20 USDC | The question's category is shown |
| **Extra Time** | 0.003 SOL | 0.60 USDC | Adds 30 seconds to the client-side timer |
| **First Letter** | 0.001 SOL | 0.20 USDC | First letter of the correct answer is revealed |
| **Skip Question** | 0.005 SOL | 1.00 USDC | Treats the current question as a wrong-answer skip; turn passes |

All hints are claimed via `claim_hint` (SOL) or `claim_hint_usdc` (USDC). The instruction transfers from the player wallet, splits the fee, and writes a bit to the `HintLedger` PDA.

## Revenue split

```
Player pays hint price
  |
  +-- 80% --> Treasury (hardcoded compile-time constant)
  +-- 20% --> Escrow PDA (added to the prize pool)
```

The split is enforced by the program using `HINT_TREASURY_BPS = 8_000` and `HINT_PRIZE_BPS = 2_000` against `BPS_DENOMINATOR = 10_000`. No instruction can reroute the fee.

This means: when an opponent buys hints, the pot you are competing for grows. Hints make games more interesting, not less fair.

## One purchase per hint type per game

Each `(game, player)` pair has a `HintLedger` PDA with seeds `["hint", game.pubkey, player.pubkey]`. The `used_hints` field is a bitmask:

| Bit | Hint Type |
|---|---|
| 0 | EliminateTwo |
| 1 | CategoryReveal |
| 2 | ExtraTime |
| 3 | FirstLetter |
| 4 | Skip |

When `claim_hint` runs, it checks the bit. If set, the call fails with `MindDuelError::HintAlreadyUsed`. If not, it sets the bit and processes the payment. Bits are write-once — they cannot be unset.

Result: each hint type is purchasable **at most once per player per game**. You cannot stack five Eliminate 2's to brute-force a question.

## Constraints enforced by the program

`claim_hint` requires:

- `game.status == Active`
- `game.current_turn == player.key()` — only the active player can buy hints for this turn
- `hint_ledger.has_used(hint_type) == false`
- `treasury.key() == TREASURY_PUBKEY` — the hardcoded treasury constant; nobody can substitute their own address to siphon fees

## When to buy

Some patterns:

- **Eliminate 2 on a hard question.** Half the cost of Skip, gives you a 50/50.
- **First Letter on a fact-recall question.** Often enough to jog memory.
- **Extra Time + Category Reveal in Blitz.** Buys you breathing room and a hint about what kind of recall you need.
- **Skip when you genuinely have no idea.** Cheaper than committing the wrong answer and losing the cell.

## On-chain accounting

`claim_hint` accounts:

| Account | Mut | Signer | Notes |
|---|---|---|---|
| `player` | yes | yes | Hint purchaser; must be `current_turn` |
| `game` | — | — | Active GameAccount (validation) |
| `hint_ledger` | yes | — | `init_if_needed` PDA per (game, player) |
| `treasury` | yes | — | Hardcoded treasury — receives 80% |
| `prize_pool` | yes | — | Escrow PDA — receives 20% |
| `system_program` | — | — | |

For full instruction details, see [Smart Contracts](../technical/smart-contracts.md).
