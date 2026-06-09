# Architecture

MindDuel is a three-layer system with sharply separated responsibilities. The boundaries are enforced by design — the backend is never in the critical path for financial correctness.

| Layer | Responsibility |
|---|---|
| **Solana / Anchor** | Trustless source of truth. Holds funds. Enforces rules. |
| **Fastify Backend** | Stateless question server. Match metadata mirror. WebSocket relay. Optional sponsor wallet. |
| **Next.js Frontend** | Transaction construction. Wallet integration. Real-time UI. |

If the backend disappears, in-progress games on-chain remain valid and settleable.

## System map

```mermaid
flowchart TB
    subgraph Browser["Browser - Next.js 14"]
        UI["React UI"]
        WA["wallet-adapter (Phantom / Backpack)"]
        AC["anchor-client.ts (tx builder)"]
        TS["useTriviaSession (commit-reveal)"]
        GS["useGameState (Solana WS)"]
        WSC["WS client (/ws/:matchId)"]
    end

    subgraph Backend["Backend - Fastify - Railway"]
        TR["trivia routes"]
        MR["match routes"]
        SR["stats / leaderboard / history"]
        TN["tournament routes"]
        SP["sponsor routes"]
        WSS["WS /ws/:matchId"]
        DB["Neon Postgres (Drizzle)"]
        CR["commit-reveal session store (in-memory, 10 min TTL)"]
    end

    subgraph Solana["Solana Devnet"]
        PG["Anchor Program 8XZTXNux..."]
        GA["GameAccount PDA"]
        EA["Escrow PDA"]
        HL["HintLedger PDA"]
        TW["Treasury wallet (hardcoded)"]
    end

    UI --> WA
    UI --> TS
    UI --> WSC
    AC --> Solana
    TS --> AC
    UI --> TR
    UI --> MR
    UI --> SR
    UI --> TN
    UI --> SP
    GS -. accountSubscribe .-> GA
    WSC <-->|state, board_updated| WSS
    PG --> GA
    PG --> EA
    PG --> HL
    PG -->|2.5%| TW
    MR --> DB
    SR --> DB
```

## One full turn — data flow

```mermaid
sequenceDiagram
    actor Player
    participant UI as Frontend
    participant BE as Backend
    participant Chain as Solana

    Player->>UI: Select cell, pick answer
    UI->>BE: GET /api/trivia/question
    BE-->>UI: { sessionId, question, options }

    Player->>UI: Click answer
    UI->>UI: nonce = 32 random bytes
    UI->>UI: hash = SHA-256([answer, ...nonce])
    UI->>Chain: commit_answer(hash, cell)
    Chain-->>UI: confirmed

    UI->>BE: POST /api/trivia/reveal
    BE-->>UI: { correct, correctIndex }

    UI->>Chain: reveal_answer(answer, nonce)
    Chain->>Chain: verify hash matches
    Chain->>Chain: place mark if correct
    Chain->>Chain: apply mode mutation
    Chain->>Chain: switch turn
```

## Frontend (Next.js 14)

Key dependencies (from `frontend/package.json`):

| Package | Use |
|---|---|
| `next` 14 | App Router |
| `@coral-xyz/anchor` | Program client |
| `@solana/web3.js` | Transaction construction |
| `@solana/wallet-adapter-*` | Phantom / Backpack integration |
| `@solana/spl-token` | USDC ATA flows |
| `framer-motion` | Animations (board shift, transitions) |
| `tailwindcss` | Styling |

### Key hooks

| Hook | Purpose |
|---|---|
| `useGameState` | Subscribe to GameAccount PDA via Solana RPC WebSocket |
| `useAnchorClient` | Build AnchorClient bound to the connected wallet |
| `useTriviaSession` | Client-side commit-reveal: nonce + SHA-256 |
| `useHint` | Claim hint on-chain and fetch hint payload from backend |
| `useNetworkCheck` | Warn the user if their wallet is not on devnet |

### Pages

```
/                      Landing
/lobby                 Create / join / queue
/game/[matchId]        Live game room
/result                Settlement screen
/leaderboard           Global rankings
/history               Player match history
/tournaments           List of brackets
/tournaments/[id]      Bracket view
/spectate/[matchId]    Read-only spectator mode
/profile               Wallet profile + badges
```

## Backend (Fastify)

Single Node 20 process. Stateless except for the in-memory commit-reveal session store and the WebSocket room map.

```
backend/src/
  index.ts                      Bootstrap, CORS, plugins
  routes/
    trivia.ts                   Trivia question + reveal + peek
    match.ts                    Create / join / queue / state
    stats.ts                    Leaderboard / history / badges / finish
    tournament.ts               Bracket lifecycle
    faucet.ts                   Mock-USDC dispenser (devnet)
    sponsor.ts                  Gasless tx signing
    ws.ts                       /ws/:matchId rooms
  lib/
    db.ts, schema.ts            Drizzle ORM + Neon Postgres
    match-store.ts              Match CRUD + matchmaking queue
    commit-reveal.ts            In-memory session store (10 min TTL)
    badges.ts                   Badge metadata + award logic
    tournament-store.ts         Tournament + bracket state
  data/
    questions.ts                Curated trivia bank (6 categories, 3 difficulties)
```

## Anchor program

```
programs/mind-duel/src/
  lib.rs                        15 instruction handlers
  constants.rs                  Fees, timeouts, PDA seeds, treasury pubkey
  errors.rs                     MindDuelError (15 variants)
  state/
    game.rs                     GameAccount, GameStatus, GameMode, CellState, Currency
    hint_ledger.rs              HintLedger, HintType (bitmask)
  instructions/
    initialize_game.rs          + USDC variant
    join_game.rs                + USDC variant
    commit_answer.rs
    reveal_answer.rs
    claim_hint.rs               + USDC variant
    settle_game.rs              + USDC variant
    cancel_match.rs             + USDC variant
    resign_game.rs              + USDC variant
    timeout_turn.rs
```

## PDA derivation

| Account | Seeds | Notes |
|---|---|---|
| `GameAccount` | `["game", player_one]` | One active game per wallet |
| `Escrow` (SOL) | `["escrow", game]` | Program is the only signing authority |
| `Escrow` (USDC) | ATA of escrow PDA | `getAssociatedTokenAddressSync(usdcMint, escrowPda, true)` |
| `HintLedger` | `["hint", game, player]` | `init_if_needed` on first hint purchase |

## Real-time WebSocket layout

```mermaid
flowchart LR
    P1[Player 1] -->|/ws/:matchId| ROOM
    P2[Player 2] -->|/ws/:matchId| ROOM
    SP[Spectators] -->|/ws/:matchId?role=spectator| ROOM

    subgraph ROOM[Backend WS Room - per matchId]
        BRD[broadcastFromPlayer]
        BTV[broadcastViewerCount]
        HB[Heartbeat - ping every 30s]
        RL[Rate limit - 60 msgs / 30s]
        SZ[4 KB payload limit]
    end

    ROOM --> P1
    ROOM --> P2
    ROOM -->|read-only| SP
```

Last `board_updated` is cached per room and replayed to late-joining clients. Spectator outbound messages are silently dropped.

For the WebSocket protocol, see [Real-time Sync](./realtime-sync.md). For account schemas and instruction details, see [Smart Contracts](./smart-contracts.md).
