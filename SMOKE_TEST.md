# MindDuel — Smoke Test Checklist (Devnet)

End-to-end manual test before recording the demo. Tick each box. If a step
fails, stop and note the symptom — the **Troubleshooting** table at the bottom
maps common failures to fixes.

Program (devnet): `8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN`
Treasury / Oracle: `CPoofbZho4bJmSAyVJxfeMK9CoZpXpDYftctghwUJX86`

---

## 0. Pre-flight (config verified 2026-05-30 ✓ — just confirm nothing changed)

Actual config on this machine:

- [ ] `frontend/.env.local`:
  - `NEXT_PUBLIC_RPC_URL` = QuickNode devnet endpoint (✓ devnet, not the rate-limited public RPC)
  - `NEXT_PUBLIC_BACKEND_URL` / `NEXT_PUBLIC_API_URL` = `http://localhost:3001`
  - `NEXT_PUBLIC_WS_URL` = `ws://localhost:3001`
  - `NEXT_PUBLIC_MOCK_USDC_MINT` = `GcANNzhJDpToS3QeCqw1oAGhdcFU8qPnpfex3e1EFU4B`
  - (Program ID & treasury are hardcoded in `frontend/src/lib/constants.ts` = `8XZTXNux…` / `CPoof…` — no env needed)
- [ ] `backend/.env`: `DATABASE_URL` set (Neon) ✓, `ORACLE_KEYPAIR_PATH=.keys/payer.json` ✓, `PORT` (default 3001)
- [ ] `backend/.keys/payer.json` is the `CPoof…` key (oracle signs results with it)

> Note: backend `SPONSOR_KEYPAIR_JSON` is a *different* wallet (`Ej5nWfwN…`) that only pays fees. The **oracle** is pinned to `payer.json` (= `CPoof`) so `settle_with_proof` accepts the signatures. Verified resolve → MATCH ✓.

---

## 1. Start the services

Open **two terminals**.

- [ ] **Terminal A — backend:** (from repo root you can also use `npm run backend`)
  ```bash
  cd backend
  npm run dev
  ```
  - [ ] Logs show `Server listening … :3001`
  - [ ] Logs show `[oracle] Oracle key matches on-chain ORACLE_PUBKEY.`
        ⚠️ If instead you see `… != on-chain ORACLE_PUBKEY … will REJECT`, fix `ORACLE_KEYPAIR_PATH` before continuing.

- [ ] **Terminal B — frontend:** (from repo root: `npm run frontend`)
  ```bash
  cd frontend
  npm run dev
  ```
  - [ ] Opens on `http://localhost:3000` with no compile errors

- [ ] **Quick health pings** (third terminal or browser):
  - [ ] `http://localhost:3001/health` → `{"status":"ok",…}`
  - [ ] `http://localhost:3001/api/sponsor/pubkey` → returns a `pubkey`
  - [ ] `http://localhost:3001/api/oracle/pubkey` → returns `CPoofbZho4bJmSAyVJxfeMK9CoZpXpDYftctghwUJX86`

---

## 2. Wallet setup (two players)

You need **two wallets** — easiest is two browser profiles (or one normal + one
incognito), each with Phantom/Backpack.

- [ ] Both wallets set to **Devnet** (Phantom → Settings → Developer Settings → Testnet Mode → Devnet)
- [ ] **Wallet A** (creator) has ≥ 0.2 SOL devnet
- [ ] **Wallet B** (joiner) has ≥ 0.2 SOL devnet
- [ ] (Both can be topped up at https://faucet.solana.com — set to Devnet)

> Stake used below is small (e.g. 0.05 SOL) so two faucet drops are plenty.

---

## 3. Core flow — Classic Duel, SOL stake (the money path)

This is the headline demo. Do it end-to-end.

### Create (Wallet A)
- [ ] Connect Wallet A on `/lobby`
- [ ] Choose **Classic**, play type **Staked**, currency **SOL**, stake **0.05**
- [ ] Click **Create Game** → approve the Phantom prompt (this is `initialize_game` locking the stake)
- [ ] A **join code** modal appears (e.g. `MNDL-XXXXXX`) — copy it
- [ ] Wallet A balance dropped by ~0.05 SOL + tiny fee (or 0 fee if sponsored)

### Join (Wallet B)
- [ ] In the second profile, connect Wallet B on `/lobby`
- [ ] Enter the join code → **Join** → approve prompt (`join_game` locking B's stake)
- [ ] Both players auto-route to `/game/<matchId>`

### Play
- [ ] Trivia question appears; both can answer to take a cell
- [ ] Board updates in real time on **both** screens (WebSocket sync)
- [ ] Play until **Wallet A wins** (line of 3) — keep it decisive, not a draw

### Settle (the new oracle path) — watch the WINNER's screen
- [ ] Winner (A) sees a success toast: **"Pot claimed on-chain ✓"**
  - This is `settle_with_proof`: backend oracle signs the result, the winner's
    client submits it sponsored (no extra wallet popup).
- [ ] Winner's SOL balance increased by ~**0.0975 SOL** (pot 0.10 − 2.5% fee)
- [ ] Loser (B) sees the game end cleanly (their resign, if any, just no-ops)

### Verify on-chain (optional but great for the video)
- [ ] Open the settle tx on https://explorer.solana.com/?cluster=devnet (paste the sig from console, or look up the winner wallet's recent txs)
- [ ] Treasury `CPoof…` received the 2.5% fee
- [ ] Game PDA account is **closed** (rent refunded to player_one)

---

## 4. Secondary checks (do at least the first two)

- [ ] **Browser console is clean** during the whole match (no red errors)
- [ ] **Multi-game / nonce:** with the SAME Wallet A, create a *second* match
      (new code) while the first is done — it should succeed (previously one
      wallet could only have one game). This proves the nonce-PDA change.
- [ ] **Resign fallback:** start a fresh match, and instead of playing to a win,
      have the **loser** click **Resign/Leave** → opponent receives the pot.
- [ ] **Cancel/refund:** create a match, then cancel before anyone joins →
      stake refunded to creator, wallet free to create again.
- [ ] **Leaderboard / History** pages reflect the finished match.

---

## 5. (Optional) USDC stake flow

USDC settles via **resign / 24h-timeout** (no `settle_with_proof` for USDC yet).

- [ ] Get mock USDC from the in-app faucet (or `/api/faucet`)
- [ ] Create + join a USDC-staked match
- [ ] Play to a win → loser resigns → winner receives USDC pot − fee

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend log: `oracle key … != on-chain ORACLE_PUBKEY` | `ORACLE_KEYPAIR_PATH` wrong / points to sponsor key | Set `ORACLE_KEYPAIR_PATH=.keys/payer.json` (the `CPoof` key); restart backend |
| `/api/oracle/pubkey` ≠ `CPoof…` | same as above | same fix |
| Create/Join: "transaction reverted during simulation" | Program not deployed / stale, or wrong cluster | Confirm Phantom on **Devnet**; program already upgraded (slot deploy done) |
| "Pot claimed on-chain" never appears, no error | Winner's `reportMatchFinish` didn't land before oracle call, or backend down | Loser's resign or 24h timeout still settles; check backend is up |
| `settle_with_proof` fails with `OracleProofMismatch` | matchId→nonce mismatch FE vs BE | both use FNV-1a `nonceForMatch`; ensure FE and BE on same commit |
| Backend won't start | `DATABASE_URL` empty/unreachable | Set a valid Neon/Postgres URL in `backend/.env` |
| Wallet shows mainnet balance / 0 devnet | Wallet not on Devnet | Phantom → Developer Settings → Devnet |
| USDC actions fail | `NEXT_PUBLIC_MOCK_USDC_MINT` mismatch or no USDC | Use in-app faucet first; verify mint in `.env.local` |

---

## Done = ready to record

Minimum green bar for the demo video:
- ✅ Section 1 (services up, oracle key matches)
- ✅ Section 3 (create → join → play → **winner paid via oracle settle**)
- ✅ Section 4 first two boxes (clean console + multi-game)
