# MindDuel — Smoke Test Checklist (Celo mainnet)

End-to-end manual QA before recording the demo. Tick each box. If a step
fails, stop and note the symptom — the **Troubleshooting** table at the bottom
maps common failures to fixes.

Chain: **Celo mainnet** (chainId `42220`)
Contract: `MindDuelRanking.sol` (Foundry) — integer Elo, start `1000`, K=`32`
Ranked writes happen via a **backend relayer** (the contract owner) that calls
`recordMatch(winner, loser, draw, matchId)` and pays CELO gas. **Players never
sign a tx or pay gas.**

---

## 0. Pre-flight (confirm config)

- [ ] `frontend/.env.local`:
  - Celo mainnet RPC configured (chainId `42220`)
  - `MindDuelRanking` contract address set (matches the deployed contract)
  - `NEXT_PUBLIC_BACKEND_URL` / `NEXT_PUBLIC_API_URL` = `http://localhost:3001`
  - `NEXT_PUBLIC_WS_URL` = `ws://localhost:3001`
- [ ] `backend/.env`:
  - `DATABASE_URL` set (Postgres)
  - Relayer/owner private key set (the **contract owner** — only the owner can call `recordMatch`)
  - `PORT` (default 3001)
- [ ] The relayer wallet holds a little **CELO** for gas (it pays for every ranked write)

---

## 1. Start the services

Open **two terminals**.

- [ ] **Terminal A — backend:** (from repo root you can also use `npm run backend`)
  ```bash
  cd backend
  npm run dev
  ```
  - [ ] Logs show `Server listening … :3001`
  - [ ] No relayer/owner key errors on boot

- [ ] **Terminal B — frontend:** (from repo root: `npm run frontend`)
  ```bash
  cd frontend
  npm run dev
  ```
  - [ ] Opens on `http://localhost:3000` with no compile errors

- [ ] **Quick health pings** (third terminal or browser):
  - [ ] `GET http://localhost:3001/health` → `{"status":"ok",…}`
  - [ ] `GET http://localhost:3001/api/stats` → returns aggregate stats JSON
  - [ ] `GET http://localhost:3001/api/leaderboard` → returns ranked players with points/rank

---

## 2. Wallet setup (two players)

You need **two wallets** — easiest is two browser profiles (or one normal + one
incognito) with an injected wallet each. On mobile, MiniPay auto-connects.

- [ ] **MiniPay auto-connect:** open the app inside MiniPay → wallet connects
      automatically (no connect button needed). The `useMiniPay` hook detects
      `window.ethereum.isMiniPay`.
- [ ] **Desktop:** any injected wallet connects on `/lobby`
- [ ] Both wallets are on **Celo mainnet** (chainId `42220`)
- [ ] Players do **NOT** need any CELO — ranked writes are gasless (relayer pays)

---

## 3. Core flow — Ranked Classic match (the headline path)

This is the headline demo. Do it end-to-end.

### Create (Wallet A)
- [ ] Connect Wallet A on `/lobby`
- [ ] Choose **Classic**, mode **Ranked**
- [ ] Click **Create Game** — **no wallet popup, no gas** (this is a ranked match, not a transaction)
- [ ] A **join code** modal appears — copy it
- [ ] Note Wallet A's current points/rank (from profile or leaderboard)

### Join (Wallet B)
- [ ] In the second profile, connect Wallet B on `/lobby`
- [ ] Enter the join code → **Join**
- [ ] Both players auto-route to `/game/<matchId>`

### Play
- [ ] Trivia question appears; answer correctly to claim a cell
- [ ] Board updates in real time on **both** screens (WebSocket sync)
- [ ] **Free hints:** request hints and confirm they are **capped at 3 per match** — the 4th request is blocked/disabled
- [ ] Play until **Wallet A wins** (line of 3) — keep it decisive, not a draw

### Finish & record (watch the result screen)
- [ ] On game end, frontend hits `POST http://localhost:3001/api/match/finish`
      with `{ winner, loser, draw, matchId }`
- [ ] Backend relayer submits `recordMatch(winner, loser, draw, matchId)` on-chain (pays CELO gas)
- [ ] Result screen shows:
  - [ ] **Points delta** for both players (e.g. winner +Δ, loser −Δ)
  - [ ] Updated **rank / tier** (Bronze / Silver / Gold / Platinum / Diamond / Master)
  - [ ] A **Celoscan transaction link** for the `recordMatch` tx
- [ ] Click the Celoscan link → tx is **confirmed** on Celo mainnet

### Verify on-chain
- [ ] Read `getPlayer(<walletA>)` to confirm Wallet A's new Elo went **up**:
  - Via **Celoscan**: open the `MindDuelRanking` contract → *Read Contract* → `getPlayer` → paste Wallet A address
  - Or via **cast**:
    ```bash
    cast call <MindDuelRanking_address> "getPlayer(address)" <walletA> --rpc-url https://forno.celo.org
    ```
- [ ] `getPlayer(<walletB>)` shows Wallet B's Elo went **down**
- [ ] **Idempotency:** the same `matchId` cannot be recorded twice — re-finishing
      the same match does **not** change points again (contract is idempotent)

---

## 4. Leaderboard, history & profile

- [ ] `GET /api/leaderboard` (and the leaderboard page) reflects the new on-chain points/rank for A and B
- [ ] **History** page shows the finished ranked match with points & rank change
- [ ] **Profile** page shows current points, rank/tier, and badges (badges are DB-only)

---

## 5. Negative checks — Casual & vs-AI are NOT recorded

These must **never** write to chain or change Elo.

- [ ] **Casual match:** create + play a **Casual** match to a win → **no** `recordMatch` tx,
      **no** Celoscan link, points/rank **unchanged** for both players
- [ ] **vs-AI (practice):** play a vs-AI match to a win → **no** on-chain write, points/rank **unchanged**
- [ ] Confirm `/api/leaderboard` and `getPlayer` are unchanged after the casual / vs-AI games

---

## 6. Secondary checks

- [ ] **Browser console is clean** during the whole match (no red errors)
- [ ] **MiniPay path:** repeat section 3 inside MiniPay and confirm auto-connect + gasless finish
- [ ] **Multiple modes:** spot-check Shifting Board / Scale Up / Blitz still create & play
- [ ] **(Optional) Tournaments:** create a single-elim tournament (Ranked or Casual, 4 or 8 players, **no entry fee**) and confirm bracket flow

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Result screen shows no Celoscan link / `recordMatch` never lands | Relayer not the contract owner, or out of gas | Ensure backend key = **contract owner**; fund relayer with CELO; check `/api/match/finish` logs |
| `recordMatch` tx reverts: not owner | Backend signing key isn't the deployed contract's owner | Set the relayer key to the owner key; restart backend |
| Points didn't change after a 2nd finish | Idempotency working as intended | Expected — same `matchId` can only be recorded once |
| Casual / vs-AI changed points | Match incorrectly flagged Ranked | Confirm mode = Casual / vs-AI; only Ranked calls `/api/match/finish` |
| `getPlayer` returns 1000 for an active player | Reading wrong contract/chain, or match never recorded | Verify contract address & RPC (`forno.celo.org`, chainId 42220); confirm finish tx landed |
| Hints exceed 3 in a match | Hint cap not enforced | Hints are free but capped at **3/match**; verify the limit in the hint handler |
| Wallet won't connect | Not on Celo mainnet / no injected wallet | Switch wallet to Celo (42220); on mobile use MiniPay (auto-connect) |
| Backend won't start | `DATABASE_URL` empty/unreachable | Set a valid Postgres URL in `backend/.env` |
| `/api/leaderboard` empty | No ranked matches recorded yet | Play & finish at least one Ranked match |

---

## Done = ready to record

Minimum green bar for the demo video:
- ✅ Section 1 (services up, `/health` + `/api/stats` + `/api/leaderboard` respond)
- ✅ Section 3 (create → join → play → **finish shows points delta + rank + Celoscan link**, verified via `getPlayer`)
- ✅ Section 5 (Casual & vs-AI confirmed **not** recorded)
