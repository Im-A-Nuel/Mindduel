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

  /** Played when a hint purchase confirms — celebratory shimmer cue. */
  hint() {
    this.tone(880, 0.08, 'sine', 0.10)
    setTimeout(() => this.tone(1175, 0.10, 'sine', 0.10), 70)
    setTimeout(() => this.tone(1568, 0.14, 'sine', 0.08), 150)
  }

  /** Short urgent tick — fired each second of the final 5s of trivia timer. */
  tick() {
    this.tone(1100, 0.04, 'square', 0.08)
  }

  /** Neutral draw cue — three flat notes. */
  draw() {
    this.tone(440, 0.18, 'triangle', 0.10)
    setTimeout(() => this.tone(440, 0.18, 'triangle', 0.10), 170)
    setTimeout(() => this.tone(440, 0.20, 'triangle', 0.08), 340)
  }
}

export const sounds = new SoundEngine()
