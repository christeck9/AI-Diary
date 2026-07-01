/**
 * CPUSemaphore.ts
 * Date: 2026-05-12
 *
 * Controls execution flow to prevent CPU saturation during LLM inference.
 * When the app enters background or thermal throttling is active,
 * token streaming is paused here to avoid ANR (App Not Responding) crashes.
 */

class CPUSemaphore {
  private pauseSources = new Set<string>();
  private resumeListeners: Array<() => void> = [];

  /** Call before processing each token. Resolves immediately if not paused. */
  async waitIfPaused(): Promise<void> {
    if (!this.paused) return;
    return new Promise<void>((resolve) => {
      this.resumeListeners.push(resolve);

      // 🛡️ Safety timeout to prevent permanent deadlocks
      setTimeout(() => {
        if (this.resumeListeners.includes(resolve)) {
          console.warn('[CPUSemaphore] ⏱️ 15s timeout exceeded. Releasing stuck token.');
          this.resumeListeners = this.resumeListeners.filter(fn => fn !== resolve);
          resolve();
        }
      }, 15000);
    });
  }

  /** Pause token streaming for a specific source. */
  pause(source: string = 'generic'): void {
    this.pauseSources.add(source);
    console.log(`[CPUSemaphore] ⏸️ Streaming paused by source: ${source}. Active: ${Array.from(this.pauseSources).join(', ')}`);
  }

  /** Resume token streaming for a specific source. */
  resume(source: string = 'generic'): void {
    this.pauseSources.delete(source);
    console.log(`[CPUSemaphore] ▶️ Streaming resumed by source: ${source}. Remaining: ${Array.from(this.pauseSources).join(', ') || 'none'}`);
    
    if (!this.paused) {
      const listeners = this.resumeListeners.splice(0);
      listeners.forEach(fn => fn());
    }
  }

  /** Returns the current pause state. */
  get paused(): boolean {
    return this.pauseSources.size > 0;
  }

  /** Force release all paused sources and listeners (Emergency fallback). */
  forceReleaseAll(): void {
    console.warn('[CPUSemaphore] 🚨 forceReleaseAll invoked. Unblocking entire LLM stream.');
    this.pauseSources.clear();
    const listeners = this.resumeListeners.splice(0);
    listeners.forEach(fn => fn());
  }
}

// Singleton exported for use across the app.
export const cpuSemaphore = new CPUSemaphore();
