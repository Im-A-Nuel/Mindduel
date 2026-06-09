---
marp: true
theme: default
paginate: true
size: 16:9
backgroundColor: '#0D0D1A'
color: '#F1F5F9'
style: |
  section {
    font-family: 'Inter', sans-serif;
    padding: 60px 80px;
    background: linear-gradient(135deg, #0D0D1A 0%, #14142B 100%);
  }
  h1, h2, h3 {
    font-family: 'Space Grotesk', sans-serif;
    color: #F1F5F9;
    letter-spacing: -0.02em;
  }
  h1 { color: #7C3AED; font-size: 56px; margin-bottom: 8px; }
  h2 { color: #7C3AED; font-size: 40px; margin-bottom: 16px; }
  h3 { color: #06B6D4; font-size: 24px; }
  strong { color: #7C3AED; }
  em { color: #06B6D4; font-style: normal; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #1E1E3F; }
  th { color: #06B6D4; font-weight: 600; }
  ul { line-height: 1.7; }
  li { margin-bottom: 6px; }
  footer { color: #94A3B8; font-size: 14px; }
  section::after { color: #94A3B8; }
  .tagline {
    font-size: 28px;
    color: #94A3B8;
    margin-top: 8px;
    font-weight: 300;
  }
  .cta {
    color: #10B981;
    font-weight: 600;
    font-size: 22px;
  }
  .meta {
    color: #94A3B8;
    font-size: 16px;
    margin-top: 40px;
  }
---

<!-- _paginate: false -->

# MindDuel

<div class="tagline">Prove Your Mind. Climb the On-Chain Ladder.</div>

### Trivia-Gated PvP Tic Tac Toe on Celo

Two players. One board. Every move gated by a trivia question.
No bets, no luck — just a verifiable on-chain skill ranking. The smarter player climbs.

<div class="meta">
Imanuel · Solo Builder<br/>
Celo Proof of Ship
</div>

---

## The Problem → Our Solution

### ❌ The Problem
- Most on-chain games are **RNG dressed up** — spin, flip, hope
- Skill-based PvP barely exists, and where it does it's gated by gambling
- "Ranked" ladders live in private databases you have to trust
- No verifiable proof that the better player actually won

### ✅ Our Solution
**Knowledge as the gating mechanic, ranking as the reward.** To place a mark on the board, answer a trivia question correctly under a timer. Three in a row wins — and ranked wins are recorded as a **transparent, on-chain Elo ladder**.

*No staking. No betting. No trust required — just provable skill.*

---

## How It Works · Live Demo

### 🎮 Game Flow

1. **Connect** — MiniPay auto-connects; any injected wallet works on desktop
2. **Match** — Create or join a Ranked match (Casual & vs-AI for practice)
3. **Duel** — Answer trivia → place X or O, race to three in a row
4. **Rank** — Winner gains Elo, loser drops — written on-chain via a relayer

### ✅ Already Live on Celo Mainnet
- Full PvP flow working end-to-end
- 5 game modes shipped: *Classic · Shifting Board · Scale Up · Blitz · vs-AI*
- **Gasless for players** — a backend relayer pays CELO gas; players never sign a tx

<span class="cta">▶ trivia-gated PvP, live on Celo</span>

---

## On-Chain Skill Ranking

### 🏆 Verifiable Elo, Not a Private Leaderboard

- Smart contract **`MindDuelRanking.sol`** (Foundry) holds every player's rating
- Integer **Elo** — everyone starts at **1000**, K-factor **32**
- `recordMatch(winner, loser, draw, matchId)` is **owner-only & idempotent** — no double-counting, no tampering
- Anyone can read ratings on-chain via viem or Celoscan

### 🥇 Rank Tiers

Bronze → **Silver (1000)** → **Gold (1200)** → **Platinum (1400)** → **Diamond (1600)** → **Master (1850)**

*Ranked = on-chain ladder. Casual & vs-AI never touch the chain.*

---

## Why Celo · Why MiniPay

### 📱 Built for Mobile-First, Real Users

- **MiniPay integration** — auto-connect via `window.ethereum.isMiniPay`, putting MindDuel in front of millions of MiniPay users with zero install friction
- **Gasless onboarding** — the relayer (contract owner) submits `recordMatch()` and pays CELO gas, so players never need to fund a wallet or approve a transaction
- **Cheap, fast finality** on Celo mainnet makes per-match on-chain writes practical
- **Open & verifiable** — every ranked result is auditable on Celoscan

> Built for **Celo Proof of Ship**: a real, shipped product on mainnet.

---

## Tech Stack · Roadmap

### 🛠 Full Stack, Shipped Solo

| Layer | Technology |
|---|---|
| Smart Contract | Solidity + Foundry *(`MindDuelRanking.sol`, integer Elo)* |
| Chain | Celo mainnet (42220) · wagmi + viem · MiniPay |
| Frontend | Next.js 14 + TypeScript |
| Backend | Fastify + relayer *(gasless `recordMatch`)* |
| Data | Drizzle + Postgres *(badges, history, trivia)* |
| Real-time | WebSockets *(board & trivia sync)* |

### 🗺 Roadmap
- More modes, deeper trivia categories & badges
- Single-elim **tournaments** (Ranked/Casual, 4 or 8 players, no entry fee)
- Seasons & leaderboard resets on top of the on-chain ladder

---

<!-- _paginate: false -->

## Why Me · Why Now

> One builder. Full stack. **Working product on mainnet.**

I shipped the **Foundry ranking contract**, **Next.js frontend**, **Fastify relayer (gasless flow)**, **MiniPay integration**, and **public docs** — solo.

Not a team. Not just a roadmap. A live game with a verifiable on-chain skill ladder you can play right now.

---

### 🔗 Try It · Verify It · Climb the Ladder

- 🎮 **Play** — trivia-gated PvP on Celo, MiniPay-ready
- 💻 **GitHub** — github.com/Im-A-Nuel/Mindduel
- 🔍 **Verify** — ranked results on Celoscan via `MindDuelRanking.sol`

<div class="cta">"The smarter player wins. Always — and now it's on-chain."</div>

<div class="meta">
Imanuel · ezranhmry@gmail.com · Celo Proof of Ship
</div>
