/**
 * Farm Visualization Configuration
 *
 * Constants for the visual farm representation.
 * Adjust these values to tune the farm appearance and behavior.
 */

// =============================================================================
// GRID CONFIGURATION
// =============================================================================

export interface VisualizationGridConfig {
  /** Number of cells in the paddy grid */
  gridSize: number;
  /** Debounce delay for state updates (ms) */
  updateDebounceMs: number;
}

export const visualizationGridConfig: VisualizationGridConfig = {
  gridSize: 12,
  updateDebounceMs: 250,
};

// =============================================================================
// DISPLAY CAPS
// =============================================================================

/**
 * Maximum number of each element to display visually.
 * Prevents visual overload when player owns many buildings.
 */
export interface DisplayCapsConfig {
  paddy: number;
  worker: number;
  buffalo: number;
  well: number;
  carrier: number;
  canal: number;
  mill: number;
  sampan: number;
}

export const displayCapsConfig: DisplayCapsConfig = {
  paddy: 12,
  worker: 6,
  buffalo: 4,
  well: 2,
  carrier: 3,
  canal: 2,
  mill: 2,
  sampan: 3,
};

// =============================================================================
// DENSITY CALCULATION
// =============================================================================

export interface DensityConfig {
  /** Divisor for calculating farm "fullness" (density = totalBuildings / maxBuildings) */
  maxBuildingsForDensity: number;
}

export const densityConfig: DensityConfig = {
  maxBuildingsForDensity: 20,
};

// =============================================================================
// ANIMATION TIMING
// =============================================================================

export interface AnimationTimingConfig {
  /** Base duration for dingy animation cycle (seconds) */
  dingyBaseDurationSeconds: number;
  /** Minimum duration for dingy animation (seconds) - prevents too-fast animation */
  dingyMinDurationSeconds: number;
}

export const animationTimingConfig: AnimationTimingConfig = {
  dingyBaseDurationSeconds: 10,
  dingyMinDurationSeconds: 2,
};

// =============================================================================
// EXPORT
// =============================================================================

export default {
  grid: visualizationGridConfig,
  displayCaps: displayCapsConfig,
  density: densityConfig,
  animation: animationTimingConfig,
};
