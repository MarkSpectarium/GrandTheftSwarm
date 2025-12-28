import type { SerializableGameState, BuildingState } from 'shared';
import { buildingProductionConfigs } from 'shared';

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

    // Look up building production config
    const buildingConfig = buildingProductionConfigs[buildingId];
    if (!buildingConfig || buildingConfig.outputs.length === 0) {
      continue;
    }

    // Apply building's idle efficiency on top of global offline efficiency
    const buildingEffectiveMs = effectiveMs * buildingConfig.idleEfficiency;

    // Calculate production for each output resource
    for (const output of buildingConfig.outputs) {
      // Production = baseAmount/sec * seconds * buildingCount
      const totalProduction =
        output.baseAmountPerSecond * (buildingEffectiveMs / 1000) * bs.owned;

      if (totalProduction > 0) {
        resourcesGained[output.resourceId] =
          (resourcesGained[output.resourceId] || 0) + totalProduction;
      }
    }
  }

  return {
    resourcesGained,
    offlineTimeMs: actualOfflineMs,
    efficiencyApplied: DEFAULT_TIMING.offlineEfficiency,
  };
}
