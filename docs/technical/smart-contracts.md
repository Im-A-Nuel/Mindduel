# Smart Contract

MindDuel has a single contract: `MindDuelRanking.sol`. It is an **on-chain points & ranking ledger** — there is no staking, betting, or escrow. Ranked matches are a pure skill ladder: winning raises your points, losing lowers them.

| | |
|---|---|
| **Contract** | `MindDuelRanking` |
| **Source** | `contracts/src/MindDuelRanking.sol` |
| **Network** | Celo mainnet (chainId `42220`) |
| **RPC** | `https://forno.celo.org` |
| **Framework** | Foundry (solc `0.8.24`) |
| **Owner** | Backend relayer — the only address that can record results |

The contract is owner-gated: only the relayer (`backend/src/lib/chain.ts`) can call `recordMatch`, and it pays the CELO gas. Players never sign a transaction to be ranked. Results are idempotent per `matchId`, so a retried submission can never double-count.

## Trust model

A trusted backend relayer (the contract `owner`) submits the authoritative result of each ranked PvP match via `recordMatch` and pays the Celo gas. Players just connect a wallet (e.g. MiniPay) and play. The frontend only **reads** the contract for points and rank.

## Player schema

```solidity
struct Player {
    uint256 points;     // current Elo rating; START (1000) until first match
    uint64  wins;
    uint64  losses;
    uint64  draws;
    uint64  lastPlayed; // unix seconds of most recent recorded match
    bool    exists;
}
```

Storage:

| Field | Type | Notes |
|---|---|---|
| `owner` | `address` | The relayer; only it can `recordMatch` / `transferOwnership` |
| `players` | `mapping(address => Player)` | Per-player rating record |
| `roster` | `address[]` | Every player that has ever been recorded (for pagination) |
| `settled` | `mapping(bytes32 => bool)` | `matchId => recorded?` — idempotency guard |

## Functions

| Function | Access | Purpose |
|---|---|---|
| `recordMatch(address winner, address loser, bool draw, bytes32 matchId)` | `onlyOwner` | Record a ranked PvP result; idempotent per `matchId` |
| `getPlayer(address who)` | view | Return the full `Player` struct for an address |
| `playerCount()` | view | Number of players in the roster |
| `getPlayers(uint256 start, uint256 count)` | view | Paginated roster read — parallel arrays of addresses and `Player` structs, for building the leaderboard off-chain |
| `transferOwnership(address newOwner)` | `onlyOwner` | Hand the relayer role to a new owner |

## `recordMatch` behaviour

```solidity
function recordMatch(address winner, address loser, bool draw, bytes32 matchId) external onlyOwner;
```

1. Reverts on a zero address (`ZeroAddress`) or `winner == loser` (`SamePlayer`).
2. Reverts if `settled[matchId]` is already true (`AlreadySettled`) — this is the idempotency guard. Otherwise marks it settled.
3. Registers any new player via `_ensure` — sets `exists = true`, seeds `points = START` (1000), pushes to `roster`, emits `PlayerRegistered`.
4. Applies integer Elo (see below). For a draw, both `winner` and `loser` are simply "player A" and "player B".
5. Updates `lastPlayed` for both players to `block.timestamp`.
6. Emits `MatchRecorded(matchId, winner, loser, draw, winnerPoints, loserPoints)`.

The relayer computes `matchId` as `keccak256` of the match id string before submitting.

## Rating math (integer Elo)

The contract implements a self-contained, zero-sum integer Elo. No floating point — the expected-score logistic is evaluated against a fixed-point lookup table scaled by `1e6`.

| Constant | Value | Meaning |
|---|---|---|
| `START` | `1000` | Starting rating on a player's first recorded match |
| `K` | `32` | K-factor — the maximum points that can move in one match |
| `SCALE` | `1_000_000` | Internal fixed-point scale for the logistic |

- **Win/loss:** the winner gains `K * (1 - E_winner)`; the loser drops the exact same amount. Zero-sum.
- **Draw:** a symmetric adjustment of `K * (0.5 - E_A)` toward the expected score of 0.5.
- **Floor:** points can never go below `0` — any drop larger than the current balance floors at zero.
- `E_self = 1 / (1 + 10^((opp - self) / 400))`, with `10^(d/400)` from a 9-point table over `|d| ∈ [0, 400]` (step 50) with linear interpolation; `|d|` is clamped at 400.

## Events

| Event | Fields | Emitted by |
|---|---|---|
| `MatchRecorded` | `matchId, winner, loser, draw, winnerPoints, loserPoints` | `recordMatch` |
| `PlayerRegistered` | `player` | first time an address is recorded |
| `OwnershipTransferred` | `previousOwner, newOwner` | constructor, `transferOwnership` |

## Errors

| Error | Meaning |
|---|---|
| `NotOwner` | Caller is not the contract owner (relayer) |
| `ZeroAddress` | `winner`, `loser`, or new owner is the zero address |
| `SamePlayer` | `winner == loser` |
| `AlreadySettled` | `matchId` has already been recorded (idempotent replay) |

## Deployment

Built and deployed with Foundry (run via WSL):

```bash
forge build
forge test
forge script script/Deploy.s.sol --rpc-url https://forno.celo.org --broadcast
```

The constructor takes an `_owner` (defaults to the deployer if zero) — set this to the relayer address so the backend can record matches. After deploy, set `RANKING_CONTRACT_ADDRESS` for the backend and `NEXT_PUBLIC_RANKING_CONTRACT_ADDRESS` for the frontend. See [Contract Addresses](../resources/program-addresses.md).

## Security model (summary)

- **Owner-only writes.** Only the relayer can call `recordMatch`. Compromising the backend cannot drain funds — there are none; the worst case is corrupted rankings.
- **Idempotency.** `settled[matchId]` ensures each match is counted exactly once, even on retries from multiple clients.
- **No custody.** The contract never holds value. It stores points only.
- **Points floor.** Ratings are floored at 0, so no underflow is possible.
- **Pure reads for clients.** The frontend reads `getPlayer` / `getPlayers` directly and never needs a signer.
