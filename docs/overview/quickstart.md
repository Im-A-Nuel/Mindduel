# Quickstart

You can be in your first MindDuel match in under two minutes. Here is the fastest path.

## What you need

| | |
|---|---|
| Wallet | [MiniPay](https://www.opera.com/products/minipay) on mobile, or any injected wallet (e.g. MetaMask) on desktop |
| Network | **Celo Mainnet** (chainId 42220, RPC `https://forno.celo.org`) |
| Funds | **None.** Nothing is staked, and you never pay gas to be ranked. |

> Inside MiniPay the app **auto-connects** — it detects `window.ethereum.isMiniPay` and wires up your wallet automatically. On desktop, any injected wallet works.

## Step 1 — Open the app

Open the live app at [mindduel-frontier.vercel.app](https://mindduel-frontier.vercel.app/). In MiniPay, open it from the MiniPay browser and it connects on its own.

## Step 2 — Connect

1. On desktop, click **Connect Wallet** in the top-right.
2. Approve the connection in your wallet popup.
3. There is nothing to fund — connecting is enough to play.

> Backend status check: [mindduel-production.up.railway.app/health](https://mindduel-production.up.railway.app/health) — should return `{ "status": "ok" }`. If it does not, matchmaking and trivia endpoints are temporarily down.

## Step 3 — Jump into a match

The fastest way to play:

1. From the lobby, click **Quick Match**.
2. Choose mode: **Classic** (the cleanest first experience).
3. Choose **Ranked** (recorded on-chain) or **Casual** (just for fun).
4. Click **Find Opponent**. The matchmaking queue pairs you with another player automatically.

Want to play a friend instead? Click **Create Match**, copy the `MNDL-XXXXXX` join code, and share it. Your friend pastes it into **Join Game**. Just want to practice? Pick **vs-AI**.

## Step 4 — Take your first turn

1. When it is your turn, click any empty cell on the board.
2. A trivia question appears with a countdown timer. Pick an answer.
3. The client commits `SHA-256(answer || nonce)` so nobody can see your answer until you reveal — no wallet signature needed.
4. On reveal, the answer is verified and your mark is placed if you got it right.
5. If you were wrong, the turn passes. No piece is placed.

Stuck on a hard question? Use one of your **3 free hints**. Hints are free — there is no paid hint economy.

## Step 5 — Win and climb

Get three in a row. If the match was **Ranked**, the result is recorded on-chain automatically: the backend **relayer** (the contract owner) calls `recordMatch()` and pays the CELO gas. Your points and rank tier update — you never sign a transaction or pay anything. **Casual** and **vs-AI** matches are not recorded.

## What to try next

- Switch to **Shifting Board** mode and watch the entire board rotate.
- Try **Scale Up** and watch the board grow from 3x3 to 5x5.
- Browse the **Leaderboard** and **History** tabs to see your on-chain rank sync from chain to UI.

## Run it locally

MindDuel is a monorepo. Use **Node 18–22**.

```bash
# 1. Install dependencies
npm install

# 2. Deploy the ranking contract
#    Foundry, run in WSL — see contracts/DEPLOY.md for the full steps.

# 3. Backend
cp backend/.env.example backend/.env
#    Set DATABASE_URL, RANKING_CONTRACT_ADDRESS, and RELAYER_PRIVATE_KEY in backend/.env
npm run db:push -w backend
npm run backend

# 4. Frontend
cp frontend/.env.example frontend/.env.local
npm run frontend
```

See `contracts/DEPLOY.md` for deploying `MindDuelRanking.sol` with Foundry. The `RELAYER_PRIVATE_KEY` belongs to the contract owner — the account that submits ranked results and pays the gas.

## Builder

MindDuel is built by **Im-A-Nuel** ([@Im-A-Nuel](https://github.com/Im-A-Nuel)). Source code: [github.com/Im-A-Nuel/Mindduel](https://github.com/Im-A-Nuel/Mindduel).
