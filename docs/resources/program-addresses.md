# Program Addresses

Everything you need to verify MindDuel on-chain — plus the live deployment URLs.

## Live deployment

| | |
|---|---|
| **Frontend (Vercel)** | [https://mindduel-frontier.vercel.app/](https://mindduel-frontier.vercel.app/) |
| **Backend (Railway)** | `https://mindduel-production.up.railway.app` |
| **Backend health** | [/health](https://mindduel-production.up.railway.app/health) |
| **GitHub** | [github.com/im-f-nuel/MinDDuel](https://github.com/im-f-nuel/MinDDuel) |

## Core program

| | |
|---|---|
| **Program ID** | `8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN` |
| **Network** | Solana Devnet |
| **Framework** | Anchor 0.30 (Rust) |
| **Explorer** | [solana.com explorer (devnet)](https://explorer.solana.com/address/8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN?cluster=devnet) |

```bash
solana program show 8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN --url devnet
```

## Treasury wallet

The address that receives the 2.5% match fee and 80% of every hint fee. Hardcoded as a compile-time constant in the program — no instruction can redirect to a different address.

```
CPoofbZho4bJmSAyVJxfeMK9CoZpXpDYftctghwUJX86
```

## PDAs

All program-derived addresses use deterministic seeds. Any client can compute them.

| Account | Seeds | Notes |
|---|---|---|
| `GameAccount` | `["game", player_one.pubkey]` | One active game per wallet at a time |
| `Escrow` (SOL) | `["escrow", game.pubkey]` | Program is the only signing authority |
| `Escrow` (USDC) | ATA of escrow PDA | `getAssociatedTokenAddressSync(usdcMint, escrowPda, true)` |
| `HintLedger` | `["hint", game.pubkey, player.pubkey]` | `init_if_needed` on first hint purchase |

### Computing PDAs in TypeScript

```typescript
import { PublicKey } from '@solana/web3.js'

const PROGRAM_ID = new PublicKey('8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN')

const [gamePda] = PublicKey.findProgramAddressSync(
  [Buffer.from('game'), playerOne.toBuffer()],
  PROGRAM_ID,
)

const [escrowPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('escrow'), gamePda.toBuffer()],
  PROGRAM_ID,
)

const [hintLedgerPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('hint'), gamePda.toBuffer(), player.toBuffer()],
  PROGRAM_ID,
)
```

### Computing PDAs in Rust

```rust
let (game_pda, _) = Pubkey::find_program_address(
    &[b"game", player_one.as_ref()],
    &PROGRAM_ID,
);

let (escrow_pda, _) = Pubkey::find_program_address(
    &[b"escrow", game_pda.as_ref()],
    &PROGRAM_ID,
);

let (hint_ledger_pda, _) = Pubkey::find_program_address(
    &[b"hint", game_pda.as_ref(), player.as_ref()],
    &PROGRAM_ID,
);
```

## Mock USDC mint (devnet)

The USDC variants use a devnet mock SPL mint. The exact mint address is set by the deployer at devnet setup and surfaced through `NEXT_PUBLIC_MOCK_USDC_MINT` (frontend) and `MOCK_USDC_MINT` (backend). On the live demo deployment, this mint is dispensed via `POST /api/faucet` (100 USDC per wallet per 24 hours).

## Verification commands

```bash
# View a settlement transaction
solana confirm -v <TX_SIGNATURE> --url devnet

# View the deployed program
solana program show 8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN --url devnet

# Inspect a specific GameAccount
solana account <GAME_PDA> --url devnet
```

## Repository

| | |
|---|---|
| **GitHub** | [github.com/im-f-nuel/MinDDuel](https://github.com/im-f-nuel/MinDDuel) |
| **Builder** | Im-A-Nuel ([@im-f-nuel](https://github.com/im-f-nuel)) |
