# Quickstart

You can be in your first MindDuel match in under two minutes. Here is the fastest path.

## What you need

| | |
|---|---|
| Wallet | [Phantom](https://phantom.com) or Backpack browser extension |
| Network | **Solana Devnet** (the program is deployed on devnet only) |
| Devnet SOL | A tiny amount — about 0.05 SOL is plenty for a few games |

> If you do not have devnet SOL, MindDuel can sponsor your transaction fees automatically. See [Sponsored Gas](../features/sponsored-gas.md). You still need a small balance to actually stake.

## Step 1 — Switch your wallet to devnet

In Phantom, open **Settings -> Developer Settings -> Testnet Mode** and choose **Solana Devnet**. Backpack has a similar toggle in the network selector.

## Step 2 — Get devnet SOL

Use any of these:

- Run `solana airdrop 2` from the Solana CLI.
- Visit a public devnet faucet such as [faucet.solana.com](https://faucet.solana.com).
- Use Phantom's built-in devnet faucet.

You only need ~0.05 SOL for the Casual stake tier.

## Step 3 — Connect

1. Open the live app at [mindduel-frontier.vercel.app](https://mindduel-frontier.vercel.app/).
2. Click **Connect Wallet** in the top-right.
3. Approve the connection in your wallet popup.

> Backend status check: [mindduel-production.up.railway.app/health](https://mindduel-production.up.railway.app/health) — should return `{ "status": "ok" }`. If it does not, matchmaking and trivia endpoints are temporarily down.

## Step 4 — Jump into a match

The fastest way to play:

1. From the lobby, click **Quick Match**.
2. Choose mode: **Classic Duel** (the cleanest first experience).
3. Set stake: **0.01 SOL** (the minimum).
4. Click **Find Opponent**. The matchmaking queue pairs you with another player automatically.

Want to play a friend instead? Click **Create Match**, copy the `MNDL-XXXXXX` join code, and share it. Your friend pastes it into **Join Game**.

## Step 5 — Take your first turn

1. When it is your turn, click any empty cell on the board.
2. A trivia question appears with a countdown timer. Pick an answer.
3. Approve the **Commit** transaction in your wallet — this locks `SHA-256(answer || nonce)` on-chain so nobody can see your answer until you reveal.
4. Approve the **Reveal** transaction — the program verifies the hash and places your mark if you got it right.
5. If you were wrong, the turn passes. No piece is placed.

## Step 6 — Win and settle

Get three in a row. On the result screen, click **Settle Game**. The winner receives `pot x 97.5%` directly to their wallet. The 2.5% platform fee is enforced by the contract — nothing is held off-chain.

The settlement transaction is linked from the result screen. Click it to verify on Solana Explorer.

## What to try next

- Switch to **Shifting Board** mode and watch the entire board rotate every 3 rounds.
- Open **Hints** and buy *Eliminate 2* (0.002 SOL) to halve a hard question.
- Browse the **Leaderboard** and **History** tabs to see your stats sync from chain to UI.

## Builder

MindDuel is built by **Im-A-Nuel** ([@im-f-nuel](https://github.com/im-f-nuel)). Source code: [github.com/im-f-nuel/MinDDuel](https://github.com/im-f-nuel/MinDDuel).
