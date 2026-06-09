# MindDuel

**Answer to Move. Think to Win.**

MindDuel is an on-chain PvP skill game on Solana. Players must answer trivia questions to earn the right to place a piece on a dynamic Tic Tac Toe board — with real SOL on the line.

Built for **Colosseum Frontier Hackathon 2026 · 100xDevs Side Track**.

---

## What Makes It Different

Traditional Tic Tac Toe is solved. MindDuel adds three layers on top:

- **Knowledge gate** — every move requires answering a trivia question correctly
- **Dynamic board mechanics** — boards that shift, scale, and evolve mid-match
- **Trustless stakes** — SOL/USDC escrow managed by an Anchor smart contract; no admin keys, no rug risk

The result is a game that is instantly familiar yet genuinely competitive.

---

## Live Demo & Links

> Deployed on Solana **Devnet** — connect Phantom or Backpack and play.

| | |
|---|---|
| **Live App** | [mindduel-frontier.vercel.app](https://mindduel-frontier.vercel.app/) |
| **Demo Video** | [youtu.be/iN9SkfHLoBg](https://youtu.be/iN9SkfHLoBg) (full app walkthrough, 2:32) |
| **Documentation** | [mindduel.gitbook.io/mindduel-docs](https://mindduel.gitbook.io/mindduel-docs) |
| **GitHub** | [github.com/im-f-nuel/MinDDuel](https://github.com/im-f-nuel/MinDDuel) |
| **Backend Health** | [mindduel-production.up.railway.app/health](https://mindduel-production.up.railway.app/health) |
| **Program ID** | `8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN` |
| **Network** | Solana Devnet |
| **Solana Explorer** | [View deployed program](https://explorer.solana.com/address/8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN?cluster=devnet) |
| **Builder** | Im-A-Nuel · [@im-f-nuel](https://github.com/im-f-nuel) · Indonesia |

---

## Game Modes

| Mode | Board | Description | Status |
|---|---|---|---|
| Classic Duel | 3×3 | Standard TTT. Answer trivia to place your piece. | ✅ MVP |
| Shifting Board | 3×3 | A random row/column shifts every 3 rounds using on-chain randomness. | ✅ MVP |
| Scale Up | 3→4→5×5 | Board grows as players hit 3-correct-answer streaks. | ✅ MVP |
| Blitz | 3×3 | 10-second timer. No extensions. Extreme pressure. | 🔜 Phase 2 |
| Ultimate TTT | 9×9 meta-grid | Nine 3×3 boards in a meta-grid. | 🔜 Stretch |

---

## Economy

| Item | Value |
|---|---|
| Platform fee | 2.5% of match pot |
| Eliminate 2 wrong answers | 0.002 SOL |
| Category Reveal | 0.001 SOL |
| Extra Time (+10s) | 0.003 SOL |
| First Letter hint | 0.001 SOL |
| Skip Question | 0.005 SOL |
| Hint revenue split | 80% treasury / 20% weekly prize pool |
| Epic Game NFT mint | 0.01 SOL (optional) |
| Draw resolution | 50/50 pot split |

---

## Repository Structure

```
mind-duel/
├── Anchor.toml                   # Anchor workspace config
├── Cargo.toml                    # Rust workspace
├── package.json                  # npm workspaces root
│
├── programs/mind-duel/src/       # Anchor smart contract (Rust)
│   ├── lib.rs                    # Program entry point
│   ├── constants.rs              # Fee BPS, timeouts
│   ├── errors.rs                 # Custom error codes
│   ├── state/
│   │   ├── game.rs               # GameAccount PDA
│   │   └── hint_ledger.rs        # HintLedger PDA
│   └── instructions/
│       ├── initialize_game.rs
│       ├── commit_answer.rs
│       ├── reveal_answer.rs
│       ├── claim_hint.rs
│       ├── settle_game.rs
│       └── timeout_turn.rs
│
├── frontend/                     # Next.js 14 + TypeScript
│   └── src/
│       ├── app/                  # Pages: /, /lobby, /game/[matchId], /result, /leaderboard, /history, /profile
│       ├── components/           # UI, game, layout, wallet components
│       ├── hooks/                # useGameState, useAnchorClient, useTriviaSession, useHint
│       └── lib/                  # anchor-client, trivia, sounds, ai, constants
│
├── backend/                      # Fastify trivia API (port 3001)
│   └── src/
│       └── routes/trivia.ts      # Question serve + commit-reveal
│
└── TECHNICAL_SPEC.md             # Full smart contract & backend specification
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Rust + Anchor 0.30 |
| Blockchain | Solana (devnet → mainnet) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| Wallet | Phantom / Backpack via `@solana/wallet-adapter` |
| NFT | Metaplex Umi SDK (soulbound badges + Epic Game NFTs) |
| Real-time | Solana RPC WebSocket account subscriptions |
| Backend API | Fastify + Zod |
| Trivia source | Open Trivia DB + custom Web3 question bank |
| AI opponent | Minimax algorithm (Easy / Medium / Hard) |

---

## Prerequisites

- **Rust** `1.75+` and `cargo`
- **Solana CLI** `1.18+`
- **Anchor CLI** `0.30.x` — `cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.30.1`
- **Node.js** `20+`
- **Phantom** or **Backpack** wallet browser extension (for demo)

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/im-f-nuel/MinDDuel.git
cd MinDDuel
```

### 2. Install dependencies

```bash
# Root (workspaces)
npm install

# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && npm install && cd ..
```

### 3. Configure Solana wallet

```bash
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json   # skip if you have one
solana airdrop 2                                        # get devnet SOL
```

### 4. Build & deploy the smart contract

```bash
# Build
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

After deploying, copy the **Program ID** from the output and update:
- `Anchor.toml` → `[programs.devnet] mind_duel = "<YOUR_PROGRAM_ID>"`
- `frontend/src/lib/constants.ts` → `PROGRAM_ID`

### 5. Start the backend

```bash
cd backend
cp .env.example .env          # fill in REVEAL_AUTHORITY_KEYPAIR and TREASURY_PUBKEY
npm run dev
# Running on http://localhost:3001
```

### 6. Start the frontend

```bash
cd frontend
cp .env.local.example .env.local    # set NEXT_PUBLIC_BACKEND_URL etc.
npm run dev
# Running on http://localhost:3000
```

Open `http://localhost:3000`, connect Phantom wallet on devnet, and play.

---

## Environment Variables

### Backend (`backend/.env`)

```bash
PORT=3001
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com
PROGRAM_ID=8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN
REVEAL_AUTHORITY_KEYPAIR=<base58_keypair_or_file_path>
TREASURY_PUBKEY=<base58_treasury_wallet>
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_PROGRAM_ID=8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

---

## Smart Contract

### Program ID
`8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN`

### Key Instructions

All instructions exist in **SOL** and **USDC** variants (suffix `_usdc`) so matches can be staked in either currency.

| Instruction | Who calls | Description |
|---|---|---|
| `initialize_game` | Player 1 | Create GameAccount PDA + escrow, lock P1 stake |
| `join_game` | Player 2 | Lock P2 stake into the same escrow PDA |
| `commit_answer` | Current player | Submit `sha256(answer_index + nonce)` hash on-chain |
| `reveal_answer` | Current player | Reveal nonce, verify answer, place piece (or forfeit) |
| `claim_hint` | Current player | Buy a hint; 80% to treasury / 20% boosts the prize pool |
| `settle_game` | Either player | Release pot to winner, take platform fee, **close GameAccount** (rent → P1) |
| `cancel_match` | Player 1 | Cancel a `WaitingForPlayer` match, refund full stake, close PDA |
| `resign_game` | Either player | Concede; opponent gets pot − 2.5% fee, PDA closes |
| `timeout_turn` | Anyone | Force-forfeit a player whose turn exceeded the 24h timeout |

### Commit-Reveal Anti-Cheat

To prevent front-running (reading the correct answer from an open transaction before submitting yours):

```
1. Backend hashes the answer:  hash = keccak256(correct_answer + salt)
2. Hash stored on-chain before the question is shown to either player
3. Player submits their answer to the backend
4. Backend reveals the salt to the contract → contract re-computes hash and compares
5. answer_hash cleared after reveal → no replay attacks
```

### Escrow Safety

- No admin key can access player funds at any point
- Funds only leave the PDA via `settle_game`, `cancel_match`, or `resign_game`
- Both players must deposit equal amounts before a match starts
- 24-hour turn timeout: opponent (or anyone) can call `timeout_turn` to claim the pot
- Player can resign on-chain anytime — opponent receives prize immediately, PDA closes
- All settle paths close the GameAccount and refund rent to player 1, freeing the wallet for new matches

---

## Anchor Tests

```bash
# Run all tests
anchor test

# Run specific test
anchor test -- --grep "initialize_game"
anchor test -- --grep "commit reveal correct answer"
anchor test -- --grep "timeout forfeit"
```

Test coverage includes: happy path, wrong signer, insufficient funds, invalid state, wrong answer, timeout, draw, win detection.

---

## Frontend Scripts

```bash
cd frontend

npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript check (tsc --noEmit)
```

---

## API Reference (Backend)

Base URL: `http://localhost:3001`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/trivia/question` | Fetch a trivia question for the current turn |
| `POST` | `/trivia/reveal` | Submit player answer → triggers on-chain reveal |
| `POST` | `/match/queue` | Join matchmaking queue |
| `POST` | `/match/create` | Create a private match (returns join code) |
| `GET` | `/match/:matchId` | Get current match state |
| `GET` | `/leaderboard` | Top 100 players (query: `?period=alltime\|week\|today`) |
| `GET` | `/health` | Service + RPC status |

Full schema in [`TECHNICAL_SPEC.md`](./TECHNICAL_SPEC.md).

---

## Demo Script (2 minutes)

1. Open the app. Connect Phantom wallet — zero friction, no signup. *(10s)*
2. Create a **Stake Mode** Classic Duel. Deposit 0.01 SOL. Share link. Opponent joins. *(20s)*
3. Trivia question appears with 20s timer. Buy "Eliminate 2" hint → 2 wrong answers disappear. Answer correctly. Piece placed. Transaction confirms in under 1 second. *(30s)*
4. Opponent answers wrong. Turn forfeited. You get a bonus consecutive move. *(15s)*
5. **Win.** Smart contract auto-releases pot minus 2.5% platform fee. Open on-chain explorer — full game history visible. *(20s)*
6. Leaderboard updates. Epic Game replay available. Streak badge NFT minted. *(25s)*

---

## Hackathon Submission Checklist

- [x] Deployed on Solana **devnet** — Program ID `8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN`
- [x] Live app published — [mindduel-frontier.vercel.app](https://mindduel-frontier.vercel.app/)
- [x] Public GitBook documentation — [mindduel.gitbook.io/mindduel-docs](https://mindduel.gitbook.io/mindduel-docs)
- [x] GitHub repo with commit history from hackathon period
- [x] On-chain hint economy (5 hint types via `claim_hint`)
- [x] Soulbound NFT badges minted automatically post-match (Metaplex Umi)
- [x] Sponsored transactions (backend pays gas; users sign zero-fee)
- [x] Stuck-match recovery (cancel / resign / timeout-settle)
- [x] Real-time PvP via WebSocket with heartbeat + auto-reconnect
- [x] Demo video — [youtu.be/iN9SkfHLoBg](https://youtu.be/iN9SkfHLoBg) (full app walkthrough, 2:32)
- [x] Pitch video uploaded (separate from demo)
- [x] Colosseum Frontier portal submission
- [x] Superteam Earn 100xDevs track submission

---

## Roadmap

**Phase 1 — Hackathon MVP (18 days)**
- Classic Duel end-to-end with real SOL escrow
- Shifting Board mode with on-chain randomness
- Hint economy (5 hint types)
- AI opponent (Minimax, 3 difficulty levels)
- Leaderboard and ranked points
- Streak badge NFT minting

**Phase 2 — Post-Hackathon (Month 1–3)**
- Ultimate TTT mode
- Public auto-matchmaking by skill tier
- Mobile-responsive PWA + Solana Mobile dApp Store
- Third-party Anchor program audit
- Mainnet launch (Casual tier)

**Phase 3 — Scale (Month 4–6)**
- Custom trivia category marketplace
- Tournament bracket system with on-chain scheduling
- White-label SDK for other Solana projects

---

## License

MIT

---

*Built for Colosseum Frontier Hackathon 2026 · 100xDevs Side Track · Superteam Earn*

**Quick links:** [Live App](https://mindduel-frontier.vercel.app/) · [Demo Video](https://youtu.be/iN9SkfHLoBg) · [Docs](https://mindduel.gitbook.io/mindduel-docs) · [GitHub](https://github.com/im-f-nuel/MinDDuel) · [Solana Explorer](https://explorer.solana.com/address/8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN?cluster=devnet)
