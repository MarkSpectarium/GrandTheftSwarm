/**
 * Building Production Configuration
 *
 * SINGLE SOURCE OF TRUTH for building production data.
 * Both client and API derive their production info from this file.
 *
 * When adding a new building:
 * 1. Add it to the buildings array below
 * 2. The client will use the full config for UI/gameplay
 * 3. The API will use outputs/idleEfficiency for offline calculations
 */

/**
 * Production output for a single resource
 */
export interface ProductionOutput {
  /** Resource produced */
  resourceId: string;
  /** Base amount per production cycle */
  baseAmount: number;
}

/**
 * Production configuration for a building
 */
export interface ProductionConfig {
  /** Resources produced per production cycle */
  outputs: ProductionOutput[];
  /** Resources consumed per production cycle (optional) */
  inputs?: { resourceId: string; amount: number }[];
  /** Base production interval in milliseconds */
  baseIntervalMs: number;
  /** Does production require active play? */
  requiresActive: boolean;
  /** Efficiency when idle (0-1, where 1 = full production) */
  idleEfficiency: number;
}

/**
 * Building production definition - shared between client and API
 * Only contains production-related data needed for offline calculations.
 * Display info (name, description, etc.) lives in the client.
 */
export interface BuildingProductionDefinition {
  /** Unique identifier */
  id: string;
  /** Production configuration */
  production: ProductionConfig;
}

/**
 * All building production definitions - SINGLE SOURCE OF TRUTH
 */
export const buildingProductionDefinitions: BuildingProductionDefinition[] = [
  {
    id: 'paddy_field',
    production: {
      outputs: [{ resourceId: 'rice', baseAmount: 0.5 }],
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'family_worker',
    production: {
      outputs: [{ resourceId: 'rice', baseAmount: 1.0 }],
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 0.8,
    },
  },
  {
    id: 'buffalo',
    production: {
      outputs: [{ resourceId: 'rice', baseAmount: 5.0 }],
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'rice_mill',
    production: {
      outputs: [{ resourceId: 'rice_flour', baseAmount: 1.0 }],
      inputs: [{ resourceId: 'rice', amount: 2 }],
      baseIntervalMs: 2000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'sampan',
    production: {
      outputs: [],
      baseIntervalMs: 0,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'motorboat',
    production: {
      outputs: [],
      baseIntervalMs: 0,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'harvest_drone',
    production: {
      outputs: [{ resourceId: 'rice', baseAmount: 1000 }],
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },

  // ---------------------------------------------------------------------------
  // ERA 1: WATER SUPPLIERS
  // Buffalo consume 3L/tick each, so scale water production accordingly
  // ---------------------------------------------------------------------------
  {
    id: 'village_well',
    production: {
      outputs: [{ resourceId: 'water', baseAmount: 9 }], // Supports 3 buffalo
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'water_carrier',
    production: {
      outputs: [{ resourceId: 'water', baseAmount: 27 }], // Supports 9 buffalo
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 0.5, // Less efficient when idle (they rest!)
    },
  },
  {
    id: 'irrigation_canal',
    production: {
      outputs: [{ resourceId: 'water', baseAmount: 72 }], // Supports 24 buffalo
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },

  // ---------------------------------------------------------------------------
  // ERA 1: TRADING
  // Dingies transport and sell rice for dong
  // ---------------------------------------------------------------------------
  {
    id: 'dingy',
    production: {
      outputs: [{ resourceId: 'dong', baseAmount: 100 }], // Sells rice for 100 dong
      inputs: [{ resourceId: 'rice', amount: 1000 }], // Consumes 1000 rice per trip
      baseIntervalMs: 10000, // Every 10 seconds
      requiresActive: false,
      idleEfficiency: 0.5, // Less efficient when idle (slower without supervision)
    },
  },
];

/**
 * Map of building ID to production definition for quick lookup
 */
export const buildingProductionMap: Record<string, BuildingProductionDefinition> =
  buildingProductionDefinitions.reduce(
    (acc, def) => {
      acc[def.id] = def;
      return acc;
    },
    {} as Record<string, BuildingProductionDefinition>
  );

/**
 * Get production rate per second for offline calculations.
 * Returns empty array for buildings that require inputs (converters)
 * since we can't verify resource availability offline.
 */
export function getBuildingProductionPerSecond(
  buildingId: string
): { resourceId: string; amountPerSecond: number }[] {
  const def = buildingProductionMap[buildingId];
  if (!def || def.production.outputs.length === 0) {
    return [];
  }

  // Skip buildings that require inputs - we can't consume resources offline
  // without knowing if the player has enough
  if (def.production.inputs && def.production.inputs.length > 0) {
    return [];
  }

  const intervalSeconds = def.production.baseIntervalMs / 1000;
  if (intervalSeconds <= 0) {
    return [];
  }

  return def.production.outputs.map((output) => ({
    resourceId: output.resourceId,
    amountPerSecond: output.baseAmount / intervalSeconds,
  }));
}
