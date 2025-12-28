/**
 * Building Production Configuration
 *
 * Minimal building production info shared between client and API.
 * Used for server-side offline progress calculations.
 */

/**
 * Production output for a single resource
 */
export interface ProductionOutput {
  /** Resource produced */
  resourceId: string;
  /** Base amount per building per second */
  baseAmountPerSecond: number;
}

/**
 * Minimal production config for offline calculations
 */
export interface BuildingProductionConfig {
  /** Building ID */
  id: string;
  /** Resources this building produces */
  outputs: ProductionOutput[];
  /** Efficiency when idle (0-1, where 1 = full production) */
  idleEfficiency: number;
}

/**
 * Map of building ID to production config
 */
export type BuildingProductionMap = Record<string, BuildingProductionConfig>;

/**
 * Building production configurations for offline progress calculation.
 * This is the single source of truth for what each building produces.
 */
export const buildingProductionConfigs: BuildingProductionMap = {
  paddy_field: {
    id: 'paddy_field',
    outputs: [{ resourceId: 'rice', baseAmountPerSecond: 0.5 }],
    idleEfficiency: 1.0,
  },
  family_worker: {
    id: 'family_worker',
    outputs: [{ resourceId: 'rice', baseAmountPerSecond: 1.0 }],
    idleEfficiency: 0.8,
  },
  buffalo: {
    id: 'buffalo',
    outputs: [{ resourceId: 'rice', baseAmountPerSecond: 5.0 }],
    idleEfficiency: 1.0,
  },
  rice_mill: {
    id: 'rice_mill',
    // Mill converts rice to flour - outputs flour at 0.5/s (1 flour per 2 seconds)
    outputs: [{ resourceId: 'rice_flour', baseAmountPerSecond: 0.5 }],
    idleEfficiency: 1.0,
  },
  sampan: {
    id: 'sampan',
    // Sampans don't produce resources directly
    outputs: [],
    idleEfficiency: 1.0,
  },
  motorboat: {
    id: 'motorboat',
    // Motorboats don't produce resources directly
    outputs: [],
    idleEfficiency: 1.0,
  },
  harvest_drone: {
    id: 'harvest_drone',
    outputs: [{ resourceId: 'rice', baseAmountPerSecond: 1000 }],
    idleEfficiency: 1.0,
  },
};
