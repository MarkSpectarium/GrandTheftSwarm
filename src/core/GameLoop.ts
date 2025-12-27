/**
 * GameLoop - Core game timing and update cycle
 *
 * Handles the main game loop with delta time calculation,
 * visibility-aware tick rates, and pause/resume functionality.
 */

import { EventBus } from "./EventBus";
import type { TimingConfig } from "../config/types";

export interface GameLoopState {
  isRunning: boolean;
  isPaused: boolean;
  isVisible: boolean;
  totalTimeMs: number;
  lastTickTime: number;
  tickCount: number;
}

export class GameLoop {
  private config: TimingConfig;
  private state: GameLoopState;
  private animationFrameId: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: TimingConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      isPaused: false,
      isVisible: true,
      totalTimeMs: 0,
      lastTickTime: 0,
      tickCount: 0,
    };

    this.setupVisibilityListener();
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.lastTickTime = performance.now();

    EventBus.emit("game:start", undefined);
    this.scheduleNextTick();
  }

  /**
   * Stop the game loop completely
   */
  stop(): void {
    this.state.isRunning = false;
    this.cancelScheduledTick();
  }

  /**
   * Pause the game loop (maintains state)
   */
  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) return;

    this.state.isPaused = true;
    this.cancelScheduledTick();
    EventBus.emit("game:pause", undefined);
  }

  /**
   * Resume from pause
   */
  resume(): void {
    if (!this.state.isRunning || !this.state.isPaused) return;

    this.state.isPaused = false;
    this.state.lastTickTime = performance.now();
    this.scheduleNextTick();
    EventBus.emit("game:resume", undefined);
  }

  /**
   * Get current loop state
   */
  getState(): Readonly<GameLoopState> {
    return { ...this.state };
  }

  /**
   * Process a single tick manually (for testing or catch-up)
   */
  processTick(deltaMs: number): void {
    this.state.totalTimeMs += deltaMs;
    this.state.tickCount++;

    EventBus.emit("game:tick", {
      deltaMs,
      totalMs: this.state.totalTimeMs,
    });
  }

  /**
   * Calculate and process offline time
   */
  processOfflineTime(offlineMs: number): void {
    const maxOfflineMs = this.config.maxOfflineSeconds * 1000;
    const actualOfflineMs = Math.min(offlineMs, maxOfflineMs);
    const effectiveMs = actualOfflineMs * this.config.offlineEfficiency;

    if (effectiveMs > 0) {
      // Process as a single large tick with efficiency applied
      this.processTick(effectiveMs);
    }
  }

  private tick = (): void => {
    if (!this.state.isRunning || this.state.isPaused) return;

    try {
      const now = performance.now();
      const deltaMs = now - this.state.lastTickTime;
      this.state.lastTickTime = now;

      this.processTick(deltaMs);
    } catch (error) {
      // Log but don't crash - let the next tick try again
      console.error("GameLoop: Error during tick:", error);
    }

    // Always schedule next tick unless stopped/paused
    if (this.state.isRunning && !this.state.isPaused) {
      this.scheduleNextTick();
    }
  };

  private scheduleNextTick(): void {
    this.cancelScheduledTick();

    const tickMs = this.state.isVisible
      ? this.config.baseTickMs
      : this.config.idleTickMs;

    if (this.state.isVisible) {
      // Use requestAnimationFrame for smooth visible updates
      this.animationFrameId = requestAnimationFrame(() => {
        // Still respect tick rate even with RAF
        setTimeout(this.tick, Math.max(0, tickMs - 16));
      });
    } else {
      // Use setInterval for background processing
      this.intervalId = setTimeout(this.tick, tickMs);
    }
  }

  private cancelScheduledTick(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  private setupVisibilityListener(): void {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        const wasVisible = this.state.isVisible;
        this.state.isVisible = document.visibilityState === "visible";

        if (this.state.isRunning && !this.state.isPaused) {
          if (!wasVisible && this.state.isVisible) {
            // Returning to foreground - update timing
            this.state.lastTickTime = performance.now();
          }
          // Reschedule with appropriate tick rate
          this.scheduleNextTick();
        }
      });
    }
  }
}
