# MiniPay submission checklist

Prep for listing MindDuel on MiniPay's Discover page.
Form: https://developer.minipay.to/mini-app-listing

## Listing fields

| Field | Value |
| --- | --- |
| App name | MindDuel |
| Tagline | Trivia-gated PvP Tic-Tac-Toe on Celo — answer a question to claim each square, climb the on-chain leaderboard. |
| Publisher | Imanuel |
| Category | **games** |
| App URL (linkUrl) | https://www.mindduel.fun/ |
| Support URL | https://www.mindduel.fun/support (Telegram: https://t.me/imanuelPF) |
| Terms of Service | https://www.mindduel.fun/terms |
| Privacy Policy | https://www.mindduel.fun/terms (combined Terms & Privacy page) |
| Icon | `frontend/public/icon-512.png` (512×512) |

## Network manifest

All origins the app talks to (JS, CSS, API, RPC, external links):

| Origin | Purpose |
| --- | --- |
| https://www.mindduel.fun , https://mindduel.fun | Frontend (app is served here over HTTPS) |
| https://mindduel-production-celo.up.railway.app | Backend REST API (`/api/*`) |
| wss://mindduel-production-celo.up.railway.app | WebSocket match sync (`/ws/:matchId`) |
| https://forno.celo.org | Celo mainnet RPC (read points/leaderboard) |
| https://celoscan.io | External links to on-chain tx/address |

Fonts: Inter is self-hosted at build time via `next/font/google` — no runtime
request to Google Fonts. No external CDN scripts or stylesheets.

## Requirements status

| Requirement | Status |
| --- | --- |
| Auto-connects wallet (no connect prompt in MiniPay) | ✅ `useMiniPay` auto-connects the injected connector when `window.ethereum.isMiniPay` |
| No message signing to access | ✅ Read-only frontend; ranked results settled by a backend relayer — users never sign |
| HTTPS + valid cert | ✅ https://www.mindduel.fun |
| CORS configured | ✅ `mindduel.fun` (+ `*.vercel.app`) allowed by the backend |
| Mobile-optimized, single column, min 360×640 | ✅ Responsive; landing + app pages tuned for MiniPay |
| Works on Celo networks | ✅ Celo Mainnet (42220) |
| Error handling | ✅ Loading/empty/error states on API + contract reads |
| color-scheme meta for themed system UI | ✅ `<meta name="color-scheme" content="light dark">` |
| External links open in-place (no `target="_blank"`) | ✅ Removed |
| Touch targets ≥44px, readable text | ✅ Primary CTAs ≥46px; smallest labels lifted |
| Dependency security (exact pins, min release age, ignore-scripts, lockfile) | ✅ Exact versions pinned + root `.npmrc`; commit lockfile, install with `npm ci` |
| Branding: name + logo visible, clearly not MiniPay | ✅ Nav shows MindDuel logo + name |
| In-app Terms + Privacy links | ✅ Footer → `/terms` |
| Support link (Telegram/email/web) | ✅ `/support` + Telegram |
| **PageSpeed Insights score** | ⏳ **TODO — run and attach** (below) |
| **Contract verified on Celoscan** | ⏳ **TODO — confirm** (below) |
| Sample transactions for user-facing methods | ✅ N/A — no user-facing contract method; see note below |

## Smart contract

- **MindDuelRanking** (Celo mainnet): `0x0a42721223a0eceAE92fAfE07F800A8Adc780185`
- Celoscan: https://celoscan.io/address/0x0a42721223a0eceAE92fAfE07F800A8Adc780185
- Only write method is `recordMatch(winner, loser, draw, matchId)` — **owner-only**,
  called by the backend relayer. Users do not call any contract method themselves
  (frontend access is read-only), so there is no user-signed transaction to sample.
- For the form, link 1–2 `recordMatch` transactions (from the `MatchRecorded`
  events on the address page above) as sample ranked settlements.

## Action items (must do before submitting)

1. **PageSpeed Insights** — run https://pagespeed.web.dev/ against
   https://www.mindduel.fun/ , record the mobile score, and attach it.
   Optimize if low (images, code-splitting, cache headers).
2. **Verify the contract on Celoscan** — confirm `MindDuelRanking` source is
   published & verified at the address above. If not, verify it (see
   `contracts/DEPLOY.md`).
3. **Confirm production env** — Vercel build must have `NEXT_PUBLIC_BACKEND_URL`
   set to the Railway HTTPS URL (not localhost). `.env.local` is local-dev only.
4. **Re-run a clean install** after the dependency changes:
   `npm ci` at the repo root, then `npm run build --workspace=frontend` to
   confirm `ignore-scripts` / pinned versions don't break the production build.
5. **Support SLA** — critical issues must be fixed within 24h or the listing may
   be disabled. Keep the Telegram support channel monitored.
