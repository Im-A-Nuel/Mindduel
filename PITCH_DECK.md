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

<div class="tagline">Prove Your Mind. Win On-Chain.</div>

### Trivia-Gated PvP Tic Tac Toe on Solana

Two players. Real SOL on the line. Every move gated by a trivia question.
The smart contract holds the stakes. Your brain decides who wins.

<div class="meta">
Imanuel · Solo Builder · Indonesia<br/>
Colosseum Frontier 2026 · 100xDevs Track
</div>

---

## The Problem → Our Solution

### ❌ The Problem
- 90% of on-chain games are **RNG dressed up** — spin, flip, hope
- Skill-based PvP barely exists on Solana
- Whales win, smart players don't
- No reason to come back tomorrow except gambling

### ✅ Our Solution
**Knowledge as the gating mechanic.** Lock SOL into a trustless escrow. To place a mark on the board, answer a trivia question correctly under a timer. Three in a row → smart contract pays the winner.

*No admin. No oracle. Pure skill-versus-skill.*

---

## How It Works · Live Demo

### 🎮 Game Flow

1. **Connect** — Phantom / Backpack wallet
2. **Stake** — Lock SOL/USDC into escrow PDA
3. **Duel** — Answer trivia → place X or O
4. **Settle** — Smart contract pays winner on-chain

### ✅ Already Live on Solana Devnet
- Full PvP flow working end-to-end
- 5 game modes shipped: *Classic · Shifting Board · Scale Up · Blitz · vs-AI*
- Sponsored gas — new players need **zero SOL** to start

<span class="cta">▶ mindduel-frontier.vercel.app</span>

---

## Tech Stack · Business Model

### 🛠 Full Stack, Shipped Solo

| Layer | Technology |
|---|---|
| Smart Contract | Anchor + Rust *(escrow, commit-reveal, settle)* |
| Frontend | Next.js 14 + TypeScript + Tailwind |
| Backend | Fastify + Zod *(trivia service)* |
| Real-time | Solana WebSocket RPC |

### 💰 Sustainable Unit Economics

- **2.5%** platform fee on every pot
- **5-tier hint system** — 0.001 to 0.005 SOL per hint
- **Hint revenue split:** 80% treasury / 20% prize pool
- **Epic Game NFT** mint — 0.01 SOL

---

<!-- _paginate: false -->

## Why Me · Why Now

> One builder. Full stack. **Working product.**

I shipped the **Anchor program**, **Next.js frontend**, **Fastify backend**, **sponsored gas flow**, and **public docs** — solo, in weeks.

Not a team. Not a roadmap. A live game with on-chain escrow you can play right now.

---

### 🔗 Try It · Verify It · Stake on Skill

- 🎮 **App** — mindduel-frontier.vercel.app
- 💻 **GitHub** — github.com/im-f-nuel/MinDDuel
- 📖 **Docs** — mindduel.gitbook.io/mindduel-docs

<div class="cta">"The smarter player wins. Always."</div>

<div class="meta">
Imanuel · ezranhmry@gmail.com · Colosseum Frontier 2026
</div>
