/**
 * Tone-based sound engine using the WebAudio API. Single global instance.
 *
 * Mute state is persisted to localStorage so the preference survives reloads.
 * Components subscribe via `subscribe()` to keep their UI (e.g. mute button)
 * in sync.
 */

const STORAGE_KEY = 'mddSoundMuted'

class SoundEngine {
  private ctx: AudioContext | null = null
  private muted = false
  private listeners = new Set<(muted: boolean) => void>()

  constructor() {
    if (typeof window !== 'undefined') {
      try { this.muted = localStorage.getItem(STORAGE_KEY) === '1' } catch {}
    }
  }

  isMuted(): boolean { return this.muted }

  setMuted(value: boolean) {
    this.muted = value
    try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0') } catch {}
    this.listeners.forEach(fn => fn(value))
  }

  toggle() { this.setMuted(!this.muted) }

  subscribe(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private context(): AudioContext {
    if (!this.ctx) this.ctx = new window.AudioContext()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.18) {
    if (this.muted) return
    try {
      const ctx = this.context()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch {
      // AudioContext not available (SSR / user blocked)
    }
  }

  correct() {
    this.tone(523, 0.12)
    setTimeout(() => this.tone(659, 0.16), 110)
    setTimeout(() => this.tone(784, 0.22), 220)
  }

  wrong() {
    this.tone(220, 0.22, 'sawtooth', 0.14)
    setTimeout(() => this.tone(180, 0.28, 'sawtooth', 0.10), 200)
  }

  place() {
    this.tone(440, 0.08, 'sine', 0.10)
  }

  win() {
    ;[523, 659, 784, 1047].forEach((freq, i) =>
      setTimeout(() => this.tone(freq, 0.22), i * 100),
    )
  }

  lose() {
    this.tone(330, 0.18, 'triangle', 0.14)
    setTimeout(() => this.tone(262, 0.28, 'triangle', 0.10), 200)
  }

  timeout() {
    this.tone(330, 0.30, 'sine', 0.12)
    setTimeout(() => this.tone(262, 0.40, 'sine', 0.08), 280)
  }

  /** Played when a hint purchase confirms - celebratory shimmer cue. */
  hint() {
    this.tone(880, 0.08, 'sine', 0.10)
    setTimeout(() => this.tone(1175, 0.10, 'sine', 0.10), 70)
    setTimeout(() => this.tone(1568, 0.14, 'sine', 0.08), 150)
  }

  /** Short urgent tick - fired each second of the final 5s of trivia timer. */
  tick() {
    this.tone(1100, 0.04, 'square', 0.08)
  }

  /**
   * Heavier tick for the last-5-seconds board countdown. Deliberately louder
   * and longer than `tick()` so the final seconds read as urgent, and pitched
   * a little higher each second as time runs out.
   */
  urgentTick(secondsLeft: number) {
    const freq = 700 + (5 - Math.min(5, Math.max(1, secondsLeft))) * 90
    this.tone(freq, 0.09, 'square', 0.13)
  }

  /** Match-start countdown: three beats, then a higher GO tone. */
  countdownBeat() {
    this.tone(660, 0.10, 'sine', 0.13)
  }

  countdownGo() {
    this.tone(880, 0.12, 'sine', 0.16)
    setTimeout(() => this.tone(1320, 0.20, 'sine', 0.14), 90)
  }

  /** Neutral draw cue - three flat notes. */
  draw() {
    this.tone(440, 0.18, 'triangle', 0.10)
    setTimeout(() => this.tone(440, 0.18, 'triangle', 0.10), 170)
    setTimeout(() => this.tone(440, 0.20, 'triangle', 0.08), 340)
  }

  // ── Generic UI cues ────────────────────────────────────────────────
  // Kept short and quiet so they add texture without becoming annoying on
  // rapid interaction. All are safe to call from click handlers (a user
  // gesture, which also unlocks the AudioContext).

  /** Primary action confirm - Ready, Start, Create, Join, Play Again. */
  click() {
    this.tone(540, 0.05, 'sine', 0.11)
    setTimeout(() => this.tone(720, 0.07, 'sine', 0.10), 42)
  }

  /** Light tap - secondary buttons, nav, selecting an option. */
  tap() {
    this.tone(620, 0.035, 'sine', 0.07)
  }

  /** Selection cue - picking a mode / match type. A touch brighter than tap. */
  select() {
    this.tone(680, 0.045, 'triangle', 0.09)
    setTimeout(() => this.tone(910, 0.05, 'triangle', 0.07), 40)
  }

  /** Back / cancel / leave - a soft descending pair. */
  back() {
    this.tone(480, 0.05, 'sine', 0.08)
    setTimeout(() => this.tone(360, 0.07, 'sine', 0.07), 46)
  }

  /** UI toggle (theme, sound-on) - a single soft blip. Distinct from mute's own toggle(). */
  uiToggle() {
    this.tone(760, 0.04, 'square', 0.06)
  }

  /** Copy-to-clipboard confirmation. */
  copy() {
    this.tone(880, 0.04, 'sine', 0.08)
    setTimeout(() => this.tone(1170, 0.06, 'sine', 0.07), 45)
  }
}

export const sounds = new SoundEngine()
