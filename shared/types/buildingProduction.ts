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
 * Core building definition - shared between client and API
 */
export interface BuildingDefinition {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Plural display name */
  namePlural: string;
  /** Description */
  description: string;
  /** Production configuration */
  production: ProductionConfig;
}

/**
 * All building definitions - SINGLE SOURCE OF TRUTH
 */
export const buildingDefinitions: BuildingDefinition[] = [
  {
    id: 'paddy_field',
    name: 'Paddy Field',
    namePlural: 'Paddy Fields',
    description: 'A flooded rice paddy. The foundation of your farm.',
    production: {
      outputs: [{ resourceId: 'rice', baseAmount: 0.5 }],
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'family_worker',
    name: 'Family Member',
    namePlural: 'Family Members',
    description: 'A family member helping with the harvest.',
    production: {
      outputs: [{ resourceId: 'rice', baseAmount: 1.0 }],
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 0.8,
    },
  },
  {
    id: 'buffalo',
    name: 'Water Buffalo',
    namePlural: 'Water Buffalo',
    description: 'Strong and steady. Plows fields without rest.',
    production: {
      outputs: [{ resourceId: 'rice', baseAmount: 5.0 }],
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'rice_mill',
    name: 'Rice Mill',
    namePlural: 'Rice Mills',
    description: 'Processes raw rice into valuable flour.',
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
    name: 'Sampan',
    namePlural: 'Sampans',
    description: 'Traditional flat-bottomed boat for river transport.',
    production: {
      outputs: [],
      baseIntervalMs: 0,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'motorboat',
    name: 'Motorboat',
    namePlural: 'Motorboats',
    description: 'Faster transport with larger cargo capacity.',
    production: {
      outputs: [],
      baseIntervalMs: 0,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
  {
    id: 'harvest_drone',
    name: 'Harvest Drone',
    namePlural: 'Harvest Drones',
    description: 'Autonomous aerial harvesters. The future is now.',
    production: {
      outputs: [{ resourceId: 'rice', baseAmount: 1000 }],
      baseIntervalMs: 1000,
      requiresActive: false,
      idleEfficiency: 1.0,
    },
  },
];

/**
 * Map of building ID to definition for quick lookup
 */
export const buildingDefinitionMap: Record<string, BuildingDefinition> =
  buildingDefinitions.reduce(
    (acc, def) => {
      acc[def.id] = def;
      return acc;
    },
    {} as Record<string, BuildingDefinition>
  );

/**
 * Get production rate per second for offline calculations
 */
export function getBuildingProductionPerSecond(
  buildingId: string
): { resourceId: string; amountPerSecond: number }[] {
  const def = buildingDefinitionMap[buildingId];
  if (!def || def.production.outputs.length === 0) {
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
