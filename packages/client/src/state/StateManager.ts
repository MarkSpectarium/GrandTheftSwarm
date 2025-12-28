/**
 * StateManager - Centralized game state management
 *
 * Handles state initialization, updates, and provides
 * a single source of truth for all game data.
 */

import { EventBus } from "../core/EventBus";
import type { GameConfig, ResourceConfig, BuildingConfig } from "../config/types";
import {
  type RuntimeGameState,
  type SerializableGameState,
  type ResourceState,
  type BuildingState,
  createInitialGameState,
  createResourceState,
  createBuildingState,
  createUpgradeState,
  toSerializableState,
} from "./GameState";

export class StateManager {
  private state: RuntimeGameState;
  private config: GameConfig;
  private subscribers: Set<(state: RuntimeGameState) => void> = new Set();

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.initializeState();
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<RuntimeGameState> {
    return this.state;
  }

  /**
   * Get a specific resource state
   */
  getResource(resourceId: string): ResourceState | undefined {
    return this.state.resources[resourceId];
  }

  /**
   * Get a specific building state
   */
  getBuilding(buildingId: string): BuildingState | undefined {
    return this.state.buildings[buildingId];
  }

  /**
   * Get current era
   */
  getCurrentEra(): number {
    return this.state.currentEra;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: RuntimeGameState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Update resource amount
   */
  updateResource(
    resourceId: string,
    delta: number,
    source: string = "unknown"
  ): void {
    const resource = this.state.resources[resourceId];
    if (!resource) {
      console.warn(`StateManager: Unknown resource "${resourceId}"`);
      return;
    }

    const oldValue = resource.current;
    let newValue = oldValue + delta;

    // Apply capacity cap
    if (resource.maxCapacity !== null) {
      newValue = Math.min(newValue, resource.maxCapacity);
    }

    // Can't go below zero
    newValue = Math.max(0, newValue);

    resource.current = newValue;

    // Track lifetime gains
    if (delta > 0) {
      resource.lifetime += delta;
      EventBus.emit("resource:gained", { resourceId, amount: delta, source });
    } else {
      EventBus.emit("resource:spent", { resourceId, amount: -delta, target: source });
    }

    EventBus.emit("resource:changed", { resourceId, oldValue, newValue });

    // Check if maxed
    if (resource.maxCapacity !== null && newValue >= resource.maxCapacity) {
      EventBus.emit("resource:maxed", { resourceId });
    }

    this.notifySubscribers();
  }

  /**
   * Set resource to specific value
   */
  setResource(resourceId: string, value: number): void {
    const resource = this.state.resources[resourceId];
    if (!resource) return;

    const delta = value - resource.current;
    this.updateResource(resourceId, delta, "set");
  }

  /**
   * Check if can afford a cost
   */
  canAfford(costs: Array<{ resourceId: string; amount: number }>): boolean {
    for (const cost of costs) {
      const resource = this.state.resources[cost.resourceId];
      if (!resource || resource.current < cost.amount) {
        return false;
      }
    }
    return true;
  }

  /**
   * Deduct costs (returns false if can't afford)
   */
  deductCosts(
    costs: Array<{ resourceId: string; amount: number }>,
    target: string
  ): boolean {
    if (!this.canAfford(costs)) return false;

    for (const cost of costs) {
      this.updateResource(cost.resourceId, -cost.amount, target);
    }
    return true;
  }

  /**
   * Update building owned count
   */
  updateBuilding(buildingId: string, delta: number): void {
    const building = this.state.buildings[buildingId];
    if (!building) {
      console.warn(`StateManager: Unknown building "${buildingId}"`);
      return;
    }

    building.owned += delta;
    if (delta > 0) {
      building.totalPurchased += delta;
      this.state.statistics.totalBuildingsPurchased += delta;

      EventBus.emit("building:purchased", {
        buildingId,
        count: delta,
        totalOwned: building.owned,
      });
    }

    this.notifySubscribers();
  }

  /**
   * Unlock a building
   */
  unlockBuilding(buildingId: string): void {
    const building = this.state.buildings[buildingId];
    if (!building || building.unlocked) return;

    building.unlocked = true;
    EventBus.emit("building:unlocked", { buildingId });
    this.notifySubscribers();
  }

  /**
   * Unlock a resource
   */
  unlockResource(resourceId: string): void {
    const resource = this.state.resources[resourceId];
    if (!resource || resource.unlocked) return;

    resource.unlocked = true;
    this.notifySubscribers();
  }

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeId: string): void {
    let upgrade = this.state.upgrades[upgradeId];
    if (!upgrade) {
      upgrade = createUpgradeState();
      this.state.upgrades[upgradeId] = upgrade;
    }

    upgrade.purchased = true;
    upgrade.purchaseCount++;
    this.state.statistics.totalUpgradesPurchased++;

    EventBus.emit("upgrade:purchased", { upgradeId });
    this.notifySubscribers();
  }

  /**
   * Check if upgrade is purchased
   */
  isUpgradePurchased(upgradeId: string): boolean {
    return this.state.upgrades[upgradeId]?.purchased ?? false;
  }

  /**
   * Increment click statistics
   */
  recordClick(harvestedAmount: number): void {
    this.state.statistics.totalClicks++;
    this.state.statistics.totalClickHarvested += harvestedAmount;
  }

  /**
   * Update total play time
   */
  updatePlayTime(deltaMs: number): void {
    this.state.statistics.totalPlayTimeMs += deltaMs;
  }

  /**
   * Set current era
   */
  setEra(eraId: number): void {
    const oldEra = this.state.currentEra;
    if (eraId === oldEra) return;

    this.state.currentEra = eraId;
    EventBus.emit("era:transition:complete", { eraId });
    this.notifySubscribers();
  }

  /**
   * Unlock a feature
   */
  unlockFeature(featureId: string): void {
    this.state.unlockedFeatures.add(featureId);
    this.notifySubscribers();
  }

  /**
   * Check if feature is unlocked
   */
  isFeatureUnlocked(featureId: string): boolean {
    return this.state.unlockedFeatures.has(featureId);
  }

  /**
   * Get serializable state for saving
   */
  getSerializableState(): SerializableGameState {
    return {
      ...toSerializableState(this.state),
      lastPlayedAt: Date.now(),
    };
  }

  /**
   * Load state from saved data
   */
  loadState(savedState: object): void {
    const loaded = savedState as Record<string, unknown>;

    // Restore state with type coercion
    this.state = {
      ...this.state,
      ...loaded,
      unlockedFeatures: new Set(loaded.unlockedFeatures as string[] ?? []),
      achievements: new Set(loaded.achievements as string[] ?? []),
      isNewGame: false,
    };

    // Ensure all config resources/buildings exist in state
    this.ensureStateIntegrity();

    EventBus.emit("game:load", { success: true });
    this.notifySubscribers();
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = this.initializeState();
    EventBus.emit("game:reset", undefined);
    this.notifySubscribers();
  }

  /**
   * Get time since last played (for offline progress)
   */
  getOfflineTime(): number {
    return Date.now() - this.state.lastPlayedAt;
  }

  private initializeState(): RuntimeGameState {
    const state = createInitialGameState();

    // Initialize resources from config
    for (const resource of this.config.resources) {
      state.resources[resource.id] = createResourceState(
        resource.initialAmount,
        typeof resource.maxCapacity === "number" ? resource.maxCapacity : null,
        resource.unlockedAtEra <= 1
      );
    }

    // Initialize buildings from config
    for (const building of this.config.buildings) {
      state.buildings[building.id] = createBuildingState(
        building.unlockedAtEra <= 1 && (!building.unlockRequirements || building.unlockRequirements.length === 0)
      );
    }

    return state;
  }

  private ensureStateIntegrity(): void {
    // Ensure all config resources exist in state
    for (const resource of this.config.resources) {
      if (!this.state.resources[resource.id]) {
        this.state.resources[resource.id] = createResourceState(
          resource.initialAmount,
          typeof resource.maxCapacity === "number" ? resource.maxCapacity : null,
          resource.unlockedAtEra <= this.state.currentEra
        );
      }
    }

    // Ensure all config buildings exist in state
    for (const building of this.config.buildings) {
      if (!this.state.buildings[building.id]) {
        this.state.buildings[building.id] = createBuildingState(
          building.unlockedAtEra <= this.state.currentEra
        );
      }
    }
  }

  private notifySubscribers(): void {
    // Clone state to create a new reference for React change detection
    const clonedState: RuntimeGameState = {
      ...this.state,
      resources: { ...this.state.resources },
      buildings: { ...this.state.buildings },
      upgrades: { ...this.state.upgrades },
      statistics: { ...this.state.statistics },
      unlockedFeatures: new Set(this.state.unlockedFeatures),
      achievements: new Set(this.state.achievements),
    };

    for (const callback of this.subscribers) {
      try {
        callback(clonedState);
      } catch (error) {
        console.error("StateManager: Error in subscriber:", error);
      }
    }
  }
}
