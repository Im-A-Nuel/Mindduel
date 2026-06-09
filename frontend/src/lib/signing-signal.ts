/**
 * Global signing-status broadcaster. Used to surface a "Confirm in your
 * wallet…" banner during the brief window between when we ask the wallet
 * to sign and when the user actually clicks confirm — without that, a
 * locked Phantom or blocked popup looks like a hung app.
 */

type Listener = (active: boolean) => void

class SigningSignal {
  private active = false
  private listeners = new Set<Listener>()
  private timeout: ReturnType<typeof setTimeout> | null = null

  isActive(): boolean { return this.active }

  /** Wraps a signing-bearing async fn so the banner shows for its duration. */
  async wrap<T>(fn: () => Promise<T>, hintLabel?: string): Promise<T> {
    this.start(hintLabel)
    try {
      return await fn()
    } finally {
      this.stop()
    }
  }

  start(_label?: string) {
    if (this.timeout) clearTimeout(this.timeout)
    this.active = true
    this.notify()
    // Safety: auto-clear after 60s — wallets that hang shouldn't trap the UI.
    this.timeout = setTimeout(() => this.stop(), 60_000)
  }

  stop() {
    if (this.timeout) { clearTimeout(this.timeout); this.timeout = null }
    if (!this.active) return
    this.active = false
    this.notify()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.active))
  }
}

export const signingSignal = new SigningSignal()
