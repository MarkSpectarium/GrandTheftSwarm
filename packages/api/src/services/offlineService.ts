import type { SerializableGameState, BuildingState } from 'shared';
import { buildingProductionMap, getBuildingProductionPerSecond } from 'shared';

// Default timing config (should match client)
const DEFAULT_TIMING = {
  maxOfflineSeconds: 86400, // 24 hours
  offlineEfficiency: 0.5, // 50% efficiency while offline
};

export interface OfflineProgressResult {
  resourcesGained: Record<string, number>;
  offlineTimeMs: number;
  efficiencyApplied: number;
}

/**
 * Calculate offline progress for a game state
 * This runs server-side to prevent cheating
 */
export function calculateOfflineProgress(
  state: SerializableGameState,
  lastPlayedAt: number,
  currentTime: number
): OfflineProgressResult | null {
  const offlineMs = currentTime - lastPlayedAt;

  // Must be at least 1 second offline
  if (offlineMs < 1000) {
    return null;
  }

  // Cap at max offline time
  const maxOfflineMs = DEFAULT_TIMING.maxOfflineSeconds * 1000;
  const actualOfflineMs = Math.min(offlineMs, maxOfflineMs);

  // Apply efficiency multiplier
  const effectiveMs = actualOfflineMs * DEFAULT_TIMING.offlineEfficiency;

  // Calculate resources gained from buildings
  const resourcesGained: Record<string, number> = {};

  for (const [buildingId, buildingState] of Object.entries(state.buildings)) {
    const bs = buildingState as BuildingState;
    if (!bs.unlocked || bs.owned <= 0) {
      continue;
    }

    // Look up building production config from shared
    const buildingProd = buildingProductionMap[buildingId];
    if (!buildingProd) {
      continue;
    }

    // Get production rates (already converted to per-second)
    // Note: getBuildingProductionPerSecond returns [] for buildings with inputs
    const productionRates = getBuildingProductionPerSecond(buildingId);
    if (productionRates.length === 0) {
      continue;
    }

    // Apply building's idle efficiency on top of global offline efficiency
    const idleEfficiency = buildingProd.production.idleEfficiency;
    const buildingEffectiveSeconds = (effectiveMs / 1000) * idleEfficiency;

    // Calculate production for each output resource
    for (const rate of productionRates) {
      const totalProduction = rate.amountPerSecond * buildingEffectiveSeconds * bs.owned;

      if (totalProduction > 0) {
        resourcesGained[rate.resourceId] =
          (resourcesGained[rate.resourceId] || 0) + totalProduction;
      }
    }
  }

  return {
    resourcesGained,
    offlineTimeMs: actualOfflineMs,
    efficiencyApplied: DEFAULT_TIMING.offlineEfficiency,
  };
}
