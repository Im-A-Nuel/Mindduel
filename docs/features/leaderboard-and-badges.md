# Leaderboard and Badges

MindDuel mirrors finished match results into a Postgres database (Neon, via Drizzle ORM) for fast leaderboard and history queries. The chain is still the source of truth — the database is a read-only mirror that gets reconciled after each settled match.

## Leaderboard

Available via `GET /api/leaderboard`. Players are ranked by win count.

### Query parameters

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `period` | `string` | `alltime` | `alltime`, `weekly`, or `daily` (display label only for now) |
| `limit` | `number` | `25` | Max 50 |

### Response shape

```json
{
  "period": "alltime",
  "entries": [
    {
      "rank": 1,
      "address": "7ZQmH5aBcDe...",
      "wins": 42,
      "matches": 55,
      "losses": 13,
      "solEarned": 12.75,
      "usdcEarned": 0,
      "winRate": 0.764
    }
  ]
}
```

Entries with non-Solana addresses (e.g. `"AI"` for vs-ai practice matches) are filtered out — only real wallets appear.

## Match history

`GET /api/history/:player` returns the most recent matches for a wallet, including stake, mode, currency, winner, pot, fee, and the on-chain settlement signature.

This is the data behind the **History** tab in the frontend. Every row links to the Solana Explorer for verification.

## Live stats

`GET /api/stats` returns aggregate counters across all matches:

- `totalMatches`
- `activeMatches`
- `totalPlayers`
- `totalVolumeSol`
- `totalVolumeUsdc`

These power the lobby's "live ticker."

## Badges

After a settled match, the frontend calls `POST /api/match/finish` with the on-chain settlement signature. The backend evaluates badge conditions and stores any earned badges in `badges` table, tied to the winner's wallet.

`GET /api/badges/:player` returns the player's badge collection:

```json
{
  "player": "7ZQmH5...",
  "count": 3,
  "badges": [
    {
      "id": 1,
      "type": "first_blood",
      "name": "First Blood",
      "symbol": "MNDL-FB",
      "description": "Won your first MindDuel match",
      "image": "https://...",
      "mintAddr": "NFTMintAddr...",
      "txSig": "MintTxSig...",
      "earnedAt": 1746000000000,
      "status": "minted"
    }
  ]
}
```

`status` is `"minted"` when an on-chain mint address is populated, otherwise `"pending"`.

Badge type metadata lives in `backend/src/lib/badges.ts`. Examples include `first_blood`, `high_roller`, and the Epic Game soulbound NFT (see below).

## Epic Game NFT

Every match accumulates a `drama_score` on-chain — `+5` per turn, capped at `100`. When `drama_score >= 80` (the `EPIC_DRAMA_THRESHOLD` constant), the match qualifies as an "Epic Game."

The winner of an Epic Game becomes eligible for a **soulbound NFT badge** minted via Metaplex Umi to their wallet. Soulbound = non-transferable. You cannot buy or trade an Epic Game badge — you can only earn one by playing a sufficiently dramatic match.

The drama score is on-chain and cannot be fabricated; the mint is gated by reading the on-chain `drama_score` field. Epic Game NFT minting is V1.1 (in progress) — see [Roadmap](../resources/roadmap.md).

## Database schema (high level)

| Table | Purpose |
|---|---|
| `matches` | One row per finished match: players, stake, currency, winner, pot, fee, settlement signature, timestamps |
| `badges` | One row per earned badge: type, owner, optional mint address and tx signature |
| `tournaments` | Tournament metadata + bracket state |

Defined in `backend/src/lib/schema.ts`, accessed via Drizzle ORM. The backend never writes player funds — only metadata.
