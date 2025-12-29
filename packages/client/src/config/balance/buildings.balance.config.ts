/**
 * Buildings Balance Configuration
 *
 * Numerical constants for building mechanics.
 * Adjust these values to tune building behavior.
 */

// =============================================================================
// HEALTH SYSTEM
// =============================================================================

export interface BuildingHealthConfig {
  /** Percentage threshold below which health is considered critical */
  criticalThresholdPercent: number;
}

export const buildingHealthConfig: BuildingHealthConfig = {
  criticalThresholdPercent: 25,
};

// =============================================================================
// CALCULATION LIMITS
// =============================================================================

export interface BuildingCalculationConfig {
  /** Maximum iterations for affordability calculations (safety limit) */
  maxAffordableIterations: number;
}

export const buildingCalculationConfig: BuildingCalculationConfig = {
  maxAffordableIterations: 1000,
};

export default {
  health: buildingHealthConfig,
  calculation: buildingCalculationConfig,
};
