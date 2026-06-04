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
}

// Singleton exported for use across the app.
export const cpuSemaphore = new CPUSemaphore();
