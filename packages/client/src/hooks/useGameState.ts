import { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import type { RuntimeGameState } from '../state/GameState';

/**
 * Subscribe to a specific slice of game state with a selector
 */
export function useGameState<T>(selector: (state: RuntimeGameState) => T): T {
  const { state } = useGame();
  return selector(state);
}

/**
 * Get resource amount and production rate
 */
export function useResource(resourceId: string) {
  const { state, game } = useGame();

  const resource = state.resources[resourceId];
  const resourceSystem = (game as unknown as { resourceSystem: { getProductionRate: (id: string) => number } }).resourceSystem;

  const productionRate = useMemo(() => {
    return resourceSystem.getProductionRate(resourceId);
  }, [resourceSystem, resourceId]);

  return {
    current: resource?.current ?? 0,
    lifetime: resource?.lifetime ?? 0,
    maxCapacity: resource?.maxCapacity ?? null,
    unlocked: resource?.unlocked ?? false,
    productionRate,
  };
}

/**
 * Get all unlocked resources
 */
export function useResources() {
  const { state, game } = useGame();

  const resourceSystem = (game as unknown as { resourceSystem: { getUnlockedResources: () => Array<{ id: string }> } }).resourceSystem;

  const unlockedResources = useMemo(() => {
    return resourceSystem.getUnlockedResources();
  }, [resourceSystem]);

  return useMemo(() => {
    return unlockedResources.map(config => ({
      config,
      state: state.resources[config.id],
    }));
  }, [unlockedResources, state.resources]);
}

/**
 * Get building state and computed values
 */
export function useBuilding(buildingId: string) {
  const { state, game, config } = useGame();

  const building = state.buildings[buildingId];
  const buildingConfig = config.buildings.find(b => b.id === buildingId);
  const buildingSystem = (game as unknown as { buildingSystem: { canAfford: (id: string) => boolean; getCurrentCost: (id: string) => Array<{ resourceId: string; amount: number }> } }).buildingSystem;

  const canAfford = useMemo(() => {
    return buildingSystem.canAfford(buildingId);
  }, [buildingSystem, buildingId]);

  const currentCost = useMemo(() => {
    return buildingSystem.getCurrentCost(buildingId);
  }, [buildingSystem, buildingId]);

  return {
    config: buildingConfig,
    owned: building?.owned ?? 0,
    unlocked: building?.unlocked ?? false,
    productionRate: building?.productionRate ?? 0,
    canAfford,
    currentCost,
  };
}

/**
 * Get all available (unlocked) buildings
 */
export function useBuildings() {
  const { state, game } = useGame();

  const buildingSystem = (game as unknown as { buildingSystem: { getAvailableBuildings: () => Array<{ id: string }> } }).buildingSystem;

  const availableBuildings = useMemo(() => {
    return buildingSystem.getAvailableBuildings();
  }, [buildingSystem]);

  return useMemo(() => {
    return availableBuildings.map(bConfig => ({
      config: bConfig,
      state: state.buildings[bConfig.id],
    }));
  }, [availableBuildings, state.buildings]);
}

/**
 * Get statistics
 */
export function useStatistics() {
  const { state } = useGame();
  return state.statistics;
}

/**
 * Check if player can afford a cost
 */
export function useCanAfford(costs: Array<{ resourceId: string; amount: number }>) {
  const { state } = useGame();

  return useMemo(() => {
    return costs.every(cost => {
      const resource = state.resources[cost.resourceId];
      return resource && resource.current >= cost.amount;
    });
  }, [costs, state.resources]);
}
