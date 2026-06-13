import { eq, and, asc } from 'drizzle-orm'
import { db } from './db.js'
import { checkins } from './schema.js'

export function todayIndex(): number {
  return Math.floor(Date.now() / 1000 / 86400)
}

export interface CheckInStats {
  count: number          // total distinct days checked in
  currentStreak: number  // consecutive days ending at the latest check-in
  bestStreak: number     // longest consecutive run ever
  lastDay: number | null // latest check-in day index
  checkedInToday: boolean
  streakAlive: boolean    // streak still active (last check-in today or yesterday)
}

/** Record a check-in for (player, today). Idempotent per day. */
export async function recordCheckIn(player: string, txHash: string | null): Promise<void> {
  const day = todayIndex()
  const [existing] = await db.select().from(checkins)
    .where(and(eq(checkins.player, player), eq(checkins.day, day)))
    .limit(1)
  if (existing) return
  await db.insert(checkins).values({ player, day, txHash, createdAt: Date.now() })
}

export async function getCheckInStats(player: string): Promise<CheckInStats> {
  const rows = await db.select({ day: checkins.day }).from(checkins)
    .where(eq(checkins.player, player))
    .orderBy(asc(checkins.day))

  if (rows.length === 0) {
    return { count: 0, currentStreak: 0, bestStreak: 0, lastDay: null, checkedInToday: false, streakAlive: false }
  }

  // Distinct, ascending day indices.
  const days = Array.from(new Set(rows.map(r => r.day))).sort((a, b) => a - b)
  const today = todayIndex()
  const lastDay = days[days.length - 1]

  // Longest consecutive run anywhere + the run ending at lastDay.
  let best = 1
  let run = 1
  let runEndingLast = 1
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] + 1) run += 1
    else run = 1
    if (run > best) best = run
  }
  // Run length ending exactly at lastDay.
  runEndingLast = 1
  for (let i = days.length - 1; i > 0; i--) {
    if (days[i] === days[i - 1] + 1) runEndingLast += 1
    else break
  }

  const streakAlive = lastDay >= today - 1
  return {
    count: days.length,
    currentStreak: streakAlive ? runEndingLast : 0,
    bestStreak: best,
    lastDay,
    checkedInToday: lastDay === today,
    streakAlive,
  }
}
