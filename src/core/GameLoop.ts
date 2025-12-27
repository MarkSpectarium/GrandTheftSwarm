/**
 * GameLoop - Core game timing and update cycle
 *
 * Handles the main game loop with delta time calculation,
 * visibility-aware tick rates, and pause/resume functionality.
 */

import { EventBus } from "./EventBus";
import type { TimingConfig, DevModeConfig } from "../config/types";

export interface GameLoopOptions {
  timing: TimingConfig;
  devMode?: DevModeConfig;
}

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
  private devMode: DevModeConfig | undefined;
  private state: GameLoopState;
  private animationFrameId: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;

  /**
   * Time multiplier for accelerated testing
   * 1 = normal speed, 10 = 10x speed, etc.
   */
  private timeMultiplier: number = 1;

  constructor(config: TimingConfig, devMode?: DevModeConfig) {
    this.config = config;
    this.devMode = devMode;
    this.state = {
      isRunning: false,
      isPaused: false,
      isVisible: true,
      totalTimeMs: 0,
      lastTickTime: 0,
      tickCount: 0,
    };

    // Apply dev mode time multiplier
    if (devMode?.enabled && devMode.timeMultiplier) {
      this.timeMultiplier = devMode.timeMultiplier;
      console.log(`GameLoop: Dev mode enabled with ${this.timeMultiplier}x time multiplier`);
    }

    this.setupVisibilityListener();
  }

  /**
   * Get current time multiplier
   */
  getTimeMultiplier(): number {
    return this.timeMultiplier;
  }

  /**
   * Set time multiplier at runtime (for testing)
   */
  setTimeMultiplier(multiplier: number): void {
    this.timeMultiplier = Math.max(1, multiplier);
    console.log(`GameLoop: Time multiplier set to ${this.timeMultiplier}x`);
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stop();
    this.removeVisibilityListener();
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
      const realDeltaMs = now - this.state.lastTickTime;
      this.state.lastTickTime = now;

      // Apply time multiplier for accelerated testing
      const effectiveDeltaMs = realDeltaMs * this.timeMultiplier;

      // Log ticks in debug mode
      if (this.devMode?.logTicks) {
        console.log(`GameLoop: tick ${this.state.tickCount} - real: ${realDeltaMs.toFixed(1)}ms, effective: ${effectiveDeltaMs.toFixed(1)}ms`);
      }

      this.processTick(effectiveDeltaMs);
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
      this.visibilityHandler = () => {
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
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  private removeVisibilityListener(): void {
    if (typeof document !== "undefined" && this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}
