import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, Ed25519Program, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js'
import { AnchorProvider, Program, BN, type Idl, type Wallet } from '@coral-xyz/anchor'
import { fetchSponsorPubkey, signTxWithSponsor, fetchOracleSettleProof } from './api'
import { signingSignal } from './signing-signal'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from '@solana/spl-token'
import IDL from '@/idl/mind_duel.json'
import {
  PROGRAM_ID,
  TREASURY_ADDRESS,
  MOCK_USDC_MINT,
  USDC_DECIMALS,
  BACKEND_URL,
} from './constants'

export type { Wallet as AnchorWallet }

const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID)
const GAME_SEED      = Buffer.from('game')
const ESCROW_SEED    = Buffer.from('escrow')

export interface AnchorClient {
  program: Program
  provider: AnchorProvider
}

export function buildAnchorClient(wallet: Wallet, connection: Connection): AnchorClient {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const program  = new Program(IDL as Idl, PROGRAM_PUBKEY, provider)
  return { program, provider }
}

/**
 * Deterministic per-match nonce for the game PDA. Both players derive the same
 * value from the shared matchId, so neither side needs to store an extra field
 * — the matchId already uniquely identifies the match. This is what lets one
 * wallet run several concurrent games: each match → distinct nonce → distinct
 * PDA (seeds are ["game", player_one, nonce]).
 */
export function nonceForMatch(matchId: string): BN {
  // 64-bit FNV-1a over the matchId bytes, computed with BN so it stays within
  // the project's TS target (no native BigInt literals). Distinct matchIds yield
  // distinct nonces with overwhelming probability, and the PDA also includes
  // player_one, so a collision would need the same wallet AND the same hash.
  const MASK = new BN('ffffffffffffffff', 16)
  const PRIME = new BN('100000001b3', 16)
  let hash = new BN('cbf29ce484222325', 16)
  for (let i = 0; i < matchId.length; i++) {
    hash = hash.xor(new BN(matchId.charCodeAt(i))).and(MASK)
    hash = hash.mul(PRIME).and(MASK)
  }
  return hash
}

export function findGamePDA(playerOne: PublicKey, nonce: BN): [PublicKey, number] {
  const nonceBuf = nonce.toArrayLike(Buffer, 'le', 8)
  return PublicKey.findProgramAddressSync([GAME_SEED, playerOne.toBuffer(), nonceBuf], PROGRAM_PUBKEY)
}

/**
 * Pre-flight check: does this wallet already have a GameAccount PDA on-chain?
 * The MindDuel program seeds a single GameAccount per player_one wallet, so
 * `init` will revert if one already exists. Calling this BEFORE prompting the
 * wallet lets us surface a clearer error instead of confusing the user with
 * Phantom's "transaction reverted during simulation" message.
 */
export async function hasOpenGame(
  connection: Connection,
  playerOne: PublicKey,
  matchId: string,
): Promise<boolean> {
  const [game] = findGamePDA(playerOne, nonceForMatch(matchId))
  const info = await connection.getAccountInfo(game)
  return info !== null
}

export type OpenGameStatus = 'waitingForPlayer' | 'active' | 'finished' | 'cancelled'
export type OpenGameCurrency = 'sol' | 'usdc'

export interface OpenGameInfo {
  /** Game PDA pubkey */
  gamePda:        PublicKey
  status:         OpenGameStatus
  playerOne:      PublicKey
  /** zero pubkey if no opponent has joined yet */
  playerTwo:      PublicKey | null
  currency:       OpenGameCurrency
  stakePerPlayer: BN
  lastActionTs:   number
  /** seconds until the 24h timeout-settle becomes available */
  secsUntilTimeout: number
}

/**
 * Read the existing GameAccount on-chain for this wallet. Returns null if
 * no PDA exists (wallet is free to create a new match). The Recovery flow
 * uses this to figure out what action the user can take.
 */
export async function fetchOpenGame(
  client: AnchorClient,
  playerOne: PublicKey,
  matchId: string,
): Promise<OpenGameInfo | null> {
  const [gamePda] = findGamePDA(playerOne, nonceForMatch(matchId))
  let raw: Record<string, unknown>
  try {
    raw = await (client.program.account as unknown as { gameAccount: { fetch: (k: PublicKey) => Promise<Record<string, unknown>> } })
      .gameAccount.fetch(gamePda)
  } catch {
    return null
  }
  const statusEnum = raw.status as Record<string, unknown>
  const status: OpenGameStatus =
    'waitingForPlayer' in statusEnum ? 'waitingForPlayer' :
    'active'           in statusEnum ? 'active' :
    'finished'         in statusEnum ? 'finished' :
    'cancelled'        in statusEnum ? 'cancelled' : 'active'
  // Anchor serializes the on-chain `Currency::MockUsdc` enum variant as the
  // camelCase key `mockUsdc`, NOT `usdc`. Reading the wrong key silently
  // reports every USDC match as SOL → cancel/resign/settle then call the
  // SOL variant of the instruction and the program rejects with
  // InvalidGameState (custom error 6000). Check the actual key here.
  const currencyEnum = raw.currency as Record<string, unknown>
  const currency: OpenGameCurrency =
    ('mockUsdc' in currencyEnum || 'usdc' in currencyEnum) ? 'usdc' : 'sol'
  const lastActionTs = Number(raw.lastActionTs as { toNumber?: () => number } | bigint)
  const lastActionSecs = typeof lastActionTs === 'number' && !Number.isNaN(lastActionTs)
    ? lastActionTs
    : Number((raw.lastActionTs as { toNumber: () => number }).toNumber())
  const nowSecs = Math.floor(Date.now() / 1000)
  const TIMEOUT = 86_400
  const secsUntilTimeout = Math.max(0, lastActionSecs + TIMEOUT - nowSecs)

  const p2 = raw.playerTwo as PublicKey
  const isZero = p2.toBase58() === '11111111111111111111111111111111'

  return {
    gamePda,
    status,
    playerOne: raw.playerOne as PublicKey,
    playerTwo: isZero ? null : p2,
    currency,
    stakePerPlayer: raw.stakePerPlayer as BN,
    lastActionTs:   lastActionSecs,
    secsUntilTimeout,
  }
}

export function findEscrowPDA(game: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([ESCROW_SEED, game.toBuffer()], PROGRAM_PUBKEY)
}

export function solToLamports(sol: number): BN {
  return new BN(Math.round(sol * LAMPORTS_PER_SOL))
}

export function usdcToBaseUnits(usdc: number): BN {
  return new BN(Math.round(usdc * 10 ** USDC_DECIMALS))
}

export function modeToAnchorVariant(modeId: string): Record<string, Record<string, never>> {
  switch (modeId) {
    case 'shifting': return { shiftingBoard: {} }
    case 'scaleup':  return { scaleUp: {} }
    case 'blitz':    return { blitz: {} }
    default:         return { classic: {} }
  }
}

/**
 * Send a transaction with the backend sponsor as fee payer.
 *
 *   1. Take the Anchor-built tx (or null = fall back to plain rpc).
 *   2. Set feePayer to the sponsor pubkey from BE.
 *   3. Set recent blockhash.
 *   4. Send to BE for partial-sign as fee payer.
 *   5. Have the user's wallet sign for any other required signatures.
 *   6. Send & confirm.
 *
 * Falls back to a plain user-paid tx if the sponsor isn't available
 * (e.g. BE down) so the app keeps working without sponsorship.
 */
async function sendSponsoredTx(
  client: AnchorClient,
  tx: Transaction,
  userPubkey: PublicKey,
): Promise<string> {
  const [sig] = await sendSponsoredSequence(client, [tx], userPubkey)
  return sig
}

/**
 * Sponsor-pay multiple txs while only popping the user's wallet ONCE.
 *
 * Phantom (and most adapters) implement `signAllTransactions`, which signs an
 * array of txs from a single approval prompt. We use that for the commit→reveal
 * pair so a stake match doesn't blast the user with two popups per move.
 *
 * Submission is sequential and serialized: each tx is sent + confirmed before
 * the next, because reveal_answer's program-side check requires the
 * commit_answer state to already be on-chain.
 */
async function sendSponsoredSequence(
  client: AnchorClient,
  txs: Transaction[],
  userPubkey: PublicKey,
): Promise<string[]> {
  if (txs.length === 0) return []
  const conn = client.provider.connection
  const wallet = client.provider.wallet
  const sponsorPk = await fetchSponsorPubkey()

  // Fallback: no sponsor configured → fall back to plain provider.sendAndConfirm
  // for each tx (one popup per tx; cannot bundle without sponsor flow).
  if (!sponsorPk) {
    const sigs: string[] = []
    for (const tx of txs) {
      sigs.push(await signingSignal.wrap(() => client.provider.sendAndConfirm(tx)))
    }
    return sigs
  }

  const sponsorPubkey = new PublicKey(sponsorPk)
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash()
  for (const tx of txs) {
    tx.feePayer = sponsorPubkey
    tx.recentBlockhash = blockhash
  }

  // Sponsor partial-signs each tx via the BE.
  const partials: Transaction[] = []
  try {
    for (const tx of txs) {
      const wire = tx.serialize({ requireAllSignatures: false }).toString('base64')
      const partialB64 = await signTxWithSponsor(wire)
      partials.push(Transaction.from(Buffer.from(partialB64, 'base64')))
    }
  } catch (e) {
    console.warn('Sponsor sign failed, falling back to user-paid:', e)
    // Fall back: refresh blockhash, user pays each tx individually.
    const refreshed = await conn.getLatestBlockhash()
    for (const tx of txs) {
      tx.feePayer = userPubkey
      tx.recentBlockhash = refreshed.blockhash
    }
    const sigs: string[] = []
    for (const tx of txs) {
      sigs.push(await signingSignal.wrap(() => client.provider.sendAndConfirm(tx)))
    }
    return sigs
  }

  // ONE wallet popup signs the whole batch.
  const userSigned = partials.length === 1
    ? [await signingSignal.wrap(() => wallet.signTransaction(partials[0]))]
    : await signingSignal.wrap(() => wallet.signAllTransactions(partials))

  // Submit + confirm sequentially. Reveal must see the on-chain commit state
  // before it lands, so no parallel sends here.
  const sigs: string[] = []
  for (const tx of userSigned) {
    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false })
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
    sigs.push(sig)
  }
  return sigs
}

// ── SOL flow ────────────────────────────────────────────────────────

export async function initializeGame(
  client: AnchorClient,
  playerOne: PublicKey,
  stakeSOL: number,
  modeId: string,
  matchId: string,
): Promise<string> {
  const nonce    = nonceForMatch(matchId)
  const [game]   = findGamePDA(playerOne, nonce)
  const [escrow] = findEscrowPDA(game)
  const tx = await client.program.methods
    .initializeGame(solToLamports(stakeSOL), modeToAnchorVariant(modeId) as never, nonce)
    .accounts({ playerOne, game, escrow, systemProgram: SystemProgram.programId })
    .transaction()
  return sendSponsoredTx(client, tx, playerOne)
}

export async function joinGame(
  client: AnchorClient,
  playerTwo: PublicKey,
  playerOnePubkey: PublicKey,
  matchId: string,
): Promise<string> {
  const [game]   = findGamePDA(playerOnePubkey, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const tx = await client.program.methods
    .joinGame()
    .accounts({ playerTwo, game, escrow, systemProgram: SystemProgram.programId })
    .transaction()
  return sendSponsoredTx(client, tx, playerTwo)
}

export async function settleGame(
  client: AnchorClient,
  playerOnePubkey: PublicKey,
  playerTwoPubkey: PublicKey,
  matchId: string,
): Promise<string> {
  const [game]   = findGamePDA(playerOnePubkey, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const treasury = new PublicKey(TREASURY_ADDRESS)
  const tx = await client.program.methods
    .settleGame()
    .accounts({
      game,
      escrow,
      playerOne: playerOnePubkey,
      playerTwo: playerTwoPubkey,
      treasury,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
  // settle has no required user signer beyond fee payer — use whichever wallet
  // is connected as the "user" for the sponsor flow.
  return sendSponsoredTx(client, tx, client.provider.wallet.publicKey)
}

/**
 * Cancel a SOL match that's still in WaitingForPlayer state. Refunds the
 * full stake to player_one and closes the GameAccount, freeing the wallet.
 */
export async function cancelMatch(
  client: AnchorClient,
  playerOne: PublicKey,
  matchId: string,
): Promise<string> {
  const [game]   = findGamePDA(playerOne, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const tx = await client.program.methods
    .cancelMatch()
    .accounts({ playerOne, game, escrow, systemProgram: SystemProgram.programId })
    .transaction()
  return sendSponsoredTx(client, tx, playerOne)
}

export type HintId = 'eliminate2' | 'category' | 'extra-time' | 'first-letter' | 'skip'

// Hint prices in lamports / USDC base units, mirrors programs/.../constants.rs.
const HINT_PRICE_LAMPORTS: Record<HintId, number> = {
  eliminate2:     2_000_000,
  category:       1_000_000,
  'extra-time':   3_000_000,
  'first-letter': 1_000_000,
  skip:           5_000_000,
}
const HINT_PRICE_USDC_BASE: Record<HintId, number> = {
  eliminate2:     400_000,
  category:       200_000,
  'extra-time':   600_000,
  'first-letter': 200_000,
  skip:           1_000_000,
}

/**
 * Off-chain hint purchase: split the hint price 80/20 between treasury and
 * the match escrow via direct SPL/SystemProgram transfers — bypassing the
 * Anchor `claim_hint*` instructions.
 *
 * Why we bypass the program: in off-chain gameplay mode, the on-chain
 * `game.current_turn` is never updated (no commit/reveal per move), so it
 * stays pinned to player_one. The program-level `current_turn == player`
 * guard then rejects every hint purchase by player_two (NotYourTurn / 0x1771).
 *
 * Direct token/lamport transfers don't depend on game state, work for either
 * player, and still preserve the 80% treasury / 20% prize-pool economics
 * because escrow ATA is the prize pool — its balance is what `resign_game`
 * later transfers to the winner.
 *
 * Trade-off: the on-chain HintLedger PDA is no longer touched, so the
 * "hint already used" check is purely client-side (`usedHints` Set in
 * the game page). For the hackathon demo this is acceptable.
 */
export async function payHintOffchain(
  client: AnchorClient,
  player: PublicKey,
  _playerOnePubkey: PublicKey,
  hintId: HintId,
  currency: 'sol' | 'usdc',
): Promise<string> {
  const treasury = new PublicKey(TREASURY_ADDRESS)
  const tx = new Transaction()

  // Full hint price → treasury. We considered 80/20 split with a prize-pool
  // boost (20% to escrow), but the on-chain `resign_game` / `settle_game`
  // instructions transfer the static `pot_lamports` value rather than the
  // escrow's live balance, so any extras pumped into escrow get stranded
  // there forever. Until that program-level limitation is fixed, the
  // simpler and safer thing is to send 100% to treasury.
  if (currency === 'sol') {
    tx.add(SystemProgram.transfer({
      fromPubkey: player,
      toPubkey:   treasury,
      lamports:   HINT_PRICE_LAMPORTS[hintId],
    }))
  } else {
    const usdcMint    = requireUsdcMint()
    const playerAta   = getAssociatedTokenAddressSync(usdcMint, player, false)
    const treasuryAta = getAssociatedTokenAddressSync(usdcMint, treasury, false)
    // Idempotent ATA create: cheap no-op if treasury_ata exists; otherwise
    // creates it so the very first USDC hint of the deployment works.
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(player, treasuryAta, treasury, usdcMint),
      createTransferInstruction(playerAta, treasuryAta, player, HINT_PRICE_USDC_BASE[hintId]),
    )
  }
  return sendSponsoredTx(client, tx, player)
}

/**
 * Resign an active SOL match. The signer concedes; opponent gets the prize
 * (pot - 2.5% fee). GameAccount closes so the wallet is free again.
 */
export async function resignGame(
  client: AnchorClient,
  resigner: PublicKey,
  playerOnePubkey: PublicKey,
  playerTwoPubkey: PublicKey,
  matchId: string,
): Promise<string> {
  const [game]   = findGamePDA(playerOnePubkey, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const treasury = new PublicKey(TREASURY_ADDRESS)
  const tx = await client.program.methods
    .resignGame()
    .accounts({
      resigner,
      game,
      escrow,
      playerOne: playerOnePubkey,
      playerTwo: playerTwoPubkey,
      treasury,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
  return sendSponsoredTx(client, tx, resigner)
}

/**
 * Settle a finished SOL match with an oracle-signed proof of the winner.
 *
 * Unlike resignGame (which needs the LOSER to concede), this lets the WINNER —
 * or anyone holding the proof — claim the pot the moment the game ends, so it
 * can never be stranded by an uncooperative loser. The backend oracle attests
 * the winner; we prepend the matching Ed25519 verify instruction and the program
 * checks it on-chain. No user signature is needed (the proof is the
 * authorization), so the sponsor pays the fee and the winner gets zero popups.
 */
export async function settleWithProof(
  client: AnchorClient,
  caller: PublicKey,
  playerOnePubkey: PublicKey,
  playerTwoPubkey: PublicKey,
  winner: PublicKey,
  matchId: string,
): Promise<string> {
  const proof = await fetchOracleSettleProof(matchId, winner.toBase58())
  const [game]   = findGamePDA(playerOnePubkey, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const treasury = new PublicKey(TREASURY_ADDRESS)

  const edIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: new PublicKey(proof.oraclePubkey).toBytes(),
    message:   Buffer.from(proof.message, 'base64'),
    signature: Buffer.from(proof.signature, 'base64'),
  })
  const settleIx = await client.program.methods
    .settleWithProof()
    .accounts({
      game,
      escrow,
      playerOne: playerOnePubkey,
      playerTwo: playerTwoPubkey,
      treasury,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      systemProgram: SystemProgram.programId,
    })
    .instruction()
  // Ed25519 verify ix must sit immediately before settle_with_proof — the
  // program reads the proof from `current_index - 1`.
  const tx = new Transaction().add(edIx, settleIx)

  const conn = client.provider.connection
  const sponsorPk = await fetchSponsorPubkey()
  if (sponsorPk) {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash()
    tx.feePayer = new PublicKey(sponsorPk)
    tx.recentBlockhash = blockhash
    const wire = tx.serialize({ requireAllSignatures: false }).toString('base64')
    const signedB64 = await signTxWithSponsor(wire)
    const signed = Transaction.from(Buffer.from(signedB64, 'base64'))
    const sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false })
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
    return sig
  }
  // No sponsor → the caller pays the (tiny) fee as the sole signer.
  tx.feePayer = caller
  return signingSignal.wrap(() => client.provider.sendAndConfirm(tx))
}

// ── Mock USDC flow ──────────────────────────────────────────────────

function requireUsdcMint(): PublicKey {
  if (!MOCK_USDC_MINT) {
    throw new Error('MOCK_USDC_MINT not configured. Run backend setup script and set NEXT_PUBLIC_MOCK_USDC_MINT.')
  }
  return new PublicKey(MOCK_USDC_MINT)
}

export function getUsdcAta(owner: PublicKey, allowOwnerOffCurve = true): PublicKey {
  return getAssociatedTokenAddressSync(requireUsdcMint(), owner, allowOwnerOffCurve)
}

/**
 * Read an owner's mock-USDC balance.
 *
 * A genuinely missing ATA means a zero balance and returns 0. Any OTHER error
 * (RPC down, timeout, malformed response) is re-thrown so callers can tell
 * "the user has no USDC" apart from "we couldn't check". Swallowing both as 0
 * previously made a transient RPC blip look like an empty wallet and wrongly
 * blocked players with "insufficient balance".
 */
export async function getUsdcBalance(
  connection: Connection,
  owner: PublicKey,
): Promise<number> {
  try {
    const ata = getUsdcAta(owner, false)
    const acc = await getAccount(connection, ata)
    return Number(acc.amount) / 10 ** USDC_DECIMALS
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError || e instanceof TokenInvalidAccountOwnerError) {
      return 0
    }
    throw e
  }
}

export class FaucetRateLimitError extends Error {
  constructor(message: string) { super(message); this.name = 'FaucetRateLimitError' }
}

export async function requestUsdcFaucet(walletPubkey: PublicKey): Promise<{ signature: string; amount: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are offline')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)
  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}/api/faucet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletPubkey.toBase58() }),
      signal: ctrl.signal,
    })
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Faucet request timed out')
    }
    throw new Error('Cannot reach faucet server')
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json() as { error?: string; detail?: string }
      detail = body.error ?? body.detail ?? ''
    } catch {
      detail = await res.text().catch(() => '')
    }
    if (res.status === 429) throw new FaucetRateLimitError(detail || 'Rate limited')
    throw new Error(detail || `Faucet failed (HTTP ${res.status})`)
  }
  return res.json()
}

export async function initializeGameUsdc(
  client: AnchorClient,
  playerOne: PublicKey,
  stakeUsdc: number,
  modeId: string,
  matchId: string,
): Promise<string> {
  const usdcMint = requireUsdcMint()
  const nonce    = nonceForMatch(matchId)
  const [game]   = findGamePDA(playerOne, nonce)
  const [escrow] = findEscrowPDA(game)
  const escrowAta    = getAssociatedTokenAddressSync(usdcMint, escrow, true)
  const playerOneAta = getAssociatedTokenAddressSync(usdcMint, playerOne, false)

  const tx = await client.program.methods
    .initializeGameUsdc(usdcToBaseUnits(stakeUsdc), modeToAnchorVariant(modeId) as never, nonce)
    .accounts({
      playerOne,
      usdcMint,
      game,
      escrow,
      escrowAta,
      playerOneAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
  return sendSponsoredTx(client, tx, playerOne)
}

export async function joinGameUsdc(
  client: AnchorClient,
  playerTwo: PublicKey,
  playerOnePubkey: PublicKey,
  matchId: string,
): Promise<string> {
  const usdcMint = requireUsdcMint()
  const [game]   = findGamePDA(playerOnePubkey, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const escrowAta    = getAssociatedTokenAddressSync(usdcMint, escrow, true)
  const playerTwoAta = getAssociatedTokenAddressSync(usdcMint, playerTwo, false)

  const tx = await client.program.methods
    .joinGameUsdc()
    .accounts({
      playerTwo,
      usdcMint,
      game,
      escrow,
      escrowAta,
      playerTwoAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
  return sendSponsoredTx(client, tx, playerTwo)
}

export async function settleGameUsdc(
  client: AnchorClient,
  payer: PublicKey,
  playerOnePubkey: PublicKey,
  playerTwoPubkey: PublicKey,
  matchId: string,
): Promise<string> {
  const usdcMint = requireUsdcMint()
  const [game]   = findGamePDA(playerOnePubkey, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const treasury = new PublicKey(TREASURY_ADDRESS)
  const escrowAta     = getAssociatedTokenAddressSync(usdcMint, escrow, true)
  const playerOneAta  = getAssociatedTokenAddressSync(usdcMint, playerOnePubkey, false)
  const playerTwoAta  = getAssociatedTokenAddressSync(usdcMint, playerTwoPubkey, false)
  const treasuryAta   = getAssociatedTokenAddressSync(usdcMint, treasury, false)

  const tx = await client.program.methods
    .settleGameUsdc()
    .accounts({
      game,
      usdcMint,
      escrow,
      escrowAta,
      playerOne: playerOnePubkey,
      playerOneAta,
      playerTwo: playerTwoPubkey,
      playerTwoAta,
      treasury,
      treasuryAta,
      payer,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
  return sendSponsoredTx(client, tx, payer)
}

/**
 * Cancel a USDC match in WaitingForPlayer. Refunds the staked USDC to
 * player_one's ATA and closes the GameAccount.
 */
export async function cancelMatchUsdc(
  client: AnchorClient,
  playerOne: PublicKey,
  matchId: string,
): Promise<string> {
  const usdcMint = requireUsdcMint()
  const [game]   = findGamePDA(playerOne, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const escrowAta    = getAssociatedTokenAddressSync(usdcMint, escrow, true)
  const playerOneAta = getAssociatedTokenAddressSync(usdcMint, playerOne, false)

  const tx = await client.program.methods
    .cancelMatchUsdc()
    .accounts({
      playerOne,
      usdcMint,
      game,
      escrow,
      escrowAta,
      playerOneAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
  return sendSponsoredTx(client, tx, playerOne)
}

/**
 * Resign an active USDC match. Opponent gets prize in USDC, GameAccount
 * is closed.
 */
export async function resignGameUsdc(
  client: AnchorClient,
  resigner: PublicKey,
  playerOnePubkey: PublicKey,
  playerTwoPubkey: PublicKey,
  matchId: string,
): Promise<string> {
  const usdcMint = requireUsdcMint()
  const [game]   = findGamePDA(playerOnePubkey, nonceForMatch(matchId))
  const [escrow] = findEscrowPDA(game)
  const treasury = new PublicKey(TREASURY_ADDRESS)
  const escrowAta    = getAssociatedTokenAddressSync(usdcMint, escrow, true)
  const playerOneAta = getAssociatedTokenAddressSync(usdcMint, playerOnePubkey, false)
  const playerTwoAta = getAssociatedTokenAddressSync(usdcMint, playerTwoPubkey, false)
  const treasuryAta  = getAssociatedTokenAddressSync(usdcMint, treasury, false)

  const tx = await client.program.methods
    .resignGameUsdc()
    .accounts({
      resigner,
      usdcMint,
      game,
      escrow,
      escrowAta,
      playerOne: playerOnePubkey,
      playerOneAta,
      playerTwo: playerTwoPubkey,
      playerTwoAta,
      treasury,
      treasuryAta,
      payer: resigner,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction()
  return sendSponsoredTx(client, tx, resigner)
}
