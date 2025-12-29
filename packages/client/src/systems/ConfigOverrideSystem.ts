/**
 * Config Override System
 *
 * Manages runtime config overrides that persist to localStorage.
 * Allows editing game balance values without modifying source files.
 */

import type { GameConfig, BuildingConfig, UpgradeConfig, TimingConfig } from '../config/types';

const STORAGE_KEY = 'grandtheftswarm_config_overrides';

export interface ConfigOverrides {
  version: string;
  timestamp: number;

  // Building overrides - keyed by building ID
  buildings: Record<string, Partial<BuildingOverride>>;

  // Upgrade overrides - keyed by upgrade ID
  upgrades: Record<string, Partial<UpgradeOverride>>;

  // Timing overrides
  timing: Partial<TimingConfig>;

  // Gameplay overrides
  gameplay: Partial<GameplayOverride>;
}

export interface BuildingOverride {
  // Cost overrides
  baseCostAmount: number; // For single-resource buildings
  baseCostMultiple: Record<string, number>; // resourceId -> amount

  // Production overrides
  productionAmount: number;
  productionIntervalMs: number;

  // Unlock requirement overrides
  unlockDisabled: boolean; // If true, building is always unlocked

  // Limit overrides
  maxOwned: number | null;
}

export interface UpgradeOverride {
  // Cost overrides
  costAmount: number; // For single-resource upgrades
  costMultiple: Record<string, number>; // resourceId -> amount

  // Effect overrides
  effectValue: number;

  // Unlock requirement overrides
  unlockDisabled: boolean;
}

export interface GameplayOverride {
  clickBaseAmount: number;
}

/**
 * Creates empty config overrides
 */
function createEmptyOverrides(): ConfigOverrides {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    buildings: {},
    upgrades: {},
    timing: {},
    gameplay: {},
  };
}

/**
 * Load config overrides from localStorage
 */
export function loadConfigOverrides(): ConfigOverrides {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return createEmptyOverrides();
    }

    const parsed = JSON.parse(saved) as ConfigOverrides;
    return {
      ...createEmptyOverrides(),
      ...parsed,
    };
  } catch (error) {
    console.error('ConfigOverrideSystem: Failed to load overrides', error);
    return createEmptyOverrides();
  }
}

/**
 * Save config overrides to localStorage
 */
export function saveConfigOverrides(overrides: ConfigOverrides): boolean {
  try {
    overrides.timestamp = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    return true;
  } catch (error) {
    console.error('ConfigOverrideSystem: Failed to save overrides', error);
    return false;
  }
}

/**
 * Export config overrides as JSON string
 */
export function exportConfigOverrides(overrides: ConfigOverrides): string {
  return JSON.stringify(overrides, null, 2);
}

/**
 * Import config overrides from JSON string
 */
export function importConfigOverrides(json: string): ConfigOverrides | null {
  try {
    const parsed = JSON.parse(json) as ConfigOverrides;
    // Validate structure
    if (!parsed.version || !parsed.buildings || !parsed.upgrades) {
      throw new Error('Invalid config override format');
    }
    return {
      ...createEmptyOverrides(),
      ...parsed,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('ConfigOverrideSystem: Failed to import overrides', error);
    return null;
  }
}

/**
 * Clear all config overrides
 */
export function clearConfigOverrides(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Apply config overrides to a base config
 * Returns a new config object with overrides merged in
 */
export function applyConfigOverrides(
  baseConfig: GameConfig,
  overrides: ConfigOverrides
): GameConfig {
  // Deep clone the config to avoid mutating the original
  const config = structuredClone(baseConfig);

  // Apply building overrides
  for (const building of config.buildings) {
    const override = overrides.buildings[building.id];
    if (!override) continue;

    // Apply cost overrides
    if (override.baseCostAmount !== undefined && building.baseCost.length === 1) {
      building.baseCost[0].amount = override.baseCostAmount;
    }
    if (override.baseCostMultiple) {
      for (const cost of building.baseCost) {
        if (override.baseCostMultiple[cost.resourceId] !== undefined) {
          cost.amount = override.baseCostMultiple[cost.resourceId];
        }
      }
    }

    // Apply production overrides
    if (building.production) {
      if (override.productionAmount !== undefined && building.production.outputs?.[0]) {
        building.production.outputs[0].baseAmount = override.productionAmount;
      }
      if (override.productionIntervalMs !== undefined) {
        building.production.baseIntervalMs = override.productionIntervalMs;
      }
    }

    // Apply unlock override
    if (override.unlockDisabled) {
      building.unlockRequirements = [];
    }

    // Apply max owned override
    if (override.maxOwned !== undefined) {
      building.maxOwned = override.maxOwned ?? undefined;
    }
  }

  // Apply upgrade overrides
  for (const upgrade of config.upgrades) {
    const override = overrides.upgrades[upgrade.id];
    if (!override) continue;

    // Apply cost overrides
    if (override.costAmount !== undefined && upgrade.cost.length === 1) {
      upgrade.cost[0].amount = override.costAmount;
    }
    if (override.costMultiple) {
      for (const cost of upgrade.cost) {
        if (override.costMultiple[cost.resourceId] !== undefined) {
          cost.amount = override.costMultiple[cost.resourceId];
        }
      }
    }

    // Apply effect value override
    if (override.effectValue !== undefined && upgrade.effects?.[0]) {
      upgrade.effects[0].value = override.effectValue;
    }

    // Apply unlock override
    if (override.unlockDisabled) {
      upgrade.unlockRequirements = [];
    }
  }

  // Apply timing overrides
  if (overrides.timing) {
    config.timing = {
      ...config.timing,
      ...overrides.timing,
    };
  }

  // Apply gameplay overrides
  if (overrides.gameplay?.clickBaseAmount !== undefined) {
    config.gameplay.clickBaseAmount = overrides.gameplay.clickBaseAmount;
  }

  return config;
}

/**
 * Get a summary of active overrides
 */
export function getOverrideSummary(overrides: ConfigOverrides): {
  buildingCount: number;
  upgradeCount: number;
  hasTimingOverrides: boolean;
  hasGameplayOverrides: boolean;
} {
  return {
    buildingCount: Object.keys(overrides.buildings).length,
    upgradeCount: Object.keys(overrides.upgrades).length,
    hasTimingOverrides: Object.keys(overrides.timing).length > 0,
    hasGameplayOverrides: Object.keys(overrides.gameplay).length > 0,
  };
}
