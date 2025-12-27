/**
 * Timing Configuration
 *
 * Controls game tick rates, offline progression, and time-based mechanics.
 * Adjust these values to change the game's pacing.
 */

import type { TimingConfig } from "../types";

export const timingConfig: TimingConfig = {
  // ===========================================================================
  // CORE TICK RATES
  // ===========================================================================

  /**
   * How often the game calculates production when active (milliseconds).
   * Lower = smoother numbers, higher CPU usage.
   * Recommended: 50-200ms
   */
  baseTickMs: 100,

  /**
   * Tick rate when browser tab is hidden (milliseconds).
   * Higher value saves CPU when player isn't watching.
   * Recommended: 500-2000ms
   */
  idleTickMs: 1000,

  // ===========================================================================
  // OFFLINE PROGRESSION
  // ===========================================================================

  /**
   * Maximum time (seconds) to calculate when player returns.
   * Prevents absurd gains after very long absences.
   * 86400 = 24 hours, 604800 = 1 week
   */
  maxOfflineSeconds: 86400,

  /**
   * Multiplier applied to offline gains (0-1).
   * 1.0 = full production while away
   * 0.5 = 50% production while away
   * Recommended: 0.5-0.75 to encourage active play without punishing idle
   */
  offlineEfficiency: 0.5,

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  /**
   * How often to auto-save game state (milliseconds).
   * More frequent = less progress lost on crash, more localStorage writes.
   * Recommended: 30000-60000 (30-60 seconds)
   */
  autoSaveIntervalMs: 30000,
};

// =============================================================================
// TRAVEL TIME SETTINGS
// =============================================================================

export interface TravelTimeConfig {
  /** Minimum travel time regardless of speed/distance (seconds) */
  minimumTravelSeconds: number;

  /** Base time added to all journeys (seconds) */
  baseTravelSeconds: number;

  /** Seconds added per distance unit */
  secondsPerDistanceUnit: number;

  /** Maximum travel time cap (seconds) */
  maximumTravelSeconds: number;
}

export const travelTimeConfig: TravelTimeConfig = {
  minimumTravelSeconds: 30,
  baseTravelSeconds: 60,
  secondsPerDistanceUnit: 30,
  maximumTravelSeconds: 3600, // 1 hour max
};

// =============================================================================
// PRODUCTION CYCLE SETTINGS
// =============================================================================

export interface ProductionCycleConfig {
  /** Default production interval for buildings (ms) */
  defaultProductionIntervalMs: number;

  /** Minimum production interval (speed cap) */
  minimumProductionIntervalMs: number;
}

export const productionCycleConfig: ProductionCycleConfig = {
  defaultProductionIntervalMs: 1000, // 1 second
  minimumProductionIntervalMs: 100, // 0.1 second cap
};

// =============================================================================
// EVENT TIMING
// =============================================================================

export interface EventTimingConfig {
  /** Minimum time between random events (seconds) */
  minimumEventGapSeconds: number;

  /** Default event duration (seconds) */
  defaultEventDurationSeconds: number;

  /** Grace period to click timed events (seconds) */
  eventClickGraceSeconds: number;
}

export const eventTimingConfig: EventTimingConfig = {
  minimumEventGapSeconds: 60, // At least 1 minute between events
  defaultEventDurationSeconds: 30,
  eventClickGraceSeconds: 10,
};

// =============================================================================
// PRESTIGE TIMING
// =============================================================================

export interface PrestigeTimingConfig {
  /** Minimum time before first prestige is offered (seconds) */
  minimumTimeToFirstPrestigeSeconds: number;

  /** Cooldown after prestige before next is available (seconds) */
  prestigeCooldownSeconds: number;
}

export const prestigeTimingConfig: PrestigeTimingConfig = {
  minimumTimeToFirstPrestigeSeconds: 3600, // 1 hour minimum
  prestigeCooldownSeconds: 0, // No cooldown by default
};

export default timingConfig;
