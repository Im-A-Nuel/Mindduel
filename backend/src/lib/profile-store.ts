import { inArray, eq } from 'drizzle-orm'
import { db } from './db.js'
import { profiles, type Profile } from './schema.js'

export const NAME_MIN = 2
export const NAME_MAX = 20

/**
 * Names that must not be claimable: they would let a player pose as staff or
 * as part of the platform on the leaderboard.
 */
const RESERVED = new Set([
  'admin', 'administrator', 'mod', 'moderator', 'staff', 'support',
  'mindduel', 'minipay', 'celo', 'system', 'official', 'team', 'null', 'undefined',
])

export type NameError = 'too-short' | 'too-long' | 'bad-chars' | 'looks-like-address' | 'reserved'

/**
 * Validate a display name. Kept deliberately strict: the name replaces the
 * wallet address everywhere it is shown, so it must stay short, printable, and
 * clearly not an address or an official account.
 */
export function validateDisplayName(raw: string): { ok: true; name: string } | { ok: false; error: NameError } {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < NAME_MIN) return { ok: false, error: 'too-short' }
  if (name.length > NAME_MAX) return { ok: false, error: 'too-long' }
  // Letters (incl. accented), digits, space, and a few separators only.
  if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) return { ok: false, error: 'bad-chars' }
  if (/^0x[0-9a-f]/i.test(name)) return { ok: false, error: 'looks-like-address' }
  if (RESERVED.has(name.toLowerCase())) return { ok: false, error: 'reserved' }
  return { ok: true, name }
}

function key(address: string): string {
  return address.trim().toLowerCase()
}

export async function getProfile(address: string): Promise<Profile | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.player, key(address))).limit(1)
  return rows[0] ?? null
}

/** Create or replace the caller's profile row. */
export async function upsertProfile(address: string, displayName: string, avatarSeed: string | null): Promise<Profile> {
  const player = key(address)
  const row = { player, displayName, avatarSeed, updatedAt: Date.now() }
  await db.insert(profiles).values(row).onConflictDoUpdate({
    target: profiles.player,
    set: { displayName: row.displayName, avatarSeed: row.avatarSeed, updatedAt: row.updatedAt },
  })
  return row
}

/**
 * Bulk name lookup for lists (leaderboard, history). Returns a map keyed by
 * lowercased address; addresses with no profile are simply absent, and the
 * caller falls back to its own placeholder.
 */
export async function getNamesFor(addresses: string[]): Promise<Record<string, string>> {
  const keys = Array.from(new Set(addresses.map(key).filter(Boolean)))
  if (keys.length === 0) return {}
  try {
    const rows = await db
      .select({ player: profiles.player, displayName: profiles.displayName })
      .from(profiles)
      .where(inArray(profiles.player, keys))
    const out: Record<string, string> = {}
    for (const r of rows) out[r.player] = r.displayName
    return out
  } catch {
    // Names are decoration on top of the leaderboard and history; if the table
    // is missing (schema not pushed yet) or the query fails, fall back to no
    // names rather than failing the whole listing.
    return {}
  }
}
