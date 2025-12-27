import type { SerializableGameState, BuildingState } from 'shared';

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

  for (const [, buildingState] of Object.entries(state.buildings)) {
    const bs = buildingState as BuildingState;
    if (!bs.unlocked || bs.owned <= 0) {
      continue;
    }

    // Production rate is per tick (100ms), convert to per ms
    const productionPerMs = bs.productionRate / 100;
    const totalProduction = productionPerMs * effectiveMs;

    // For now, assume all buildings produce rice
    // In a full implementation, you'd look up the building config
    // to determine what resources it produces
    if (totalProduction > 0) {
      const resourceId = 'rice'; // Simplified - would need config lookup
      resourcesGained[resourceId] = (resourcesGained[resourceId] || 0) + totalProduction;
    }
  }

  return {
    resourcesGained,
    offlineTimeMs: actualOfflineMs,
    efficiencyApplied: DEFAULT_TIMING.offlineEfficiency,
  };
}
