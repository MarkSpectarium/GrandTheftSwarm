/**
 * ConsumptionSystem - Manages resource consumption and building health
 *
 * Buildings with consumption configs need resources to survive.
 * When resources are insufficient, buildings lose health and can die.
 */

import { EventBus, SubscriptionManager } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import { ResourceSystem } from "./ResourceSystem";
import type { GameConfig, BuildingConfig, ConsumptionConfig } from "../config/types";

export interface ConsumptionInfo {
  buildingId: string;
  resourceId: string;
  required: number;
  available: number;
  consumed: number;
  missing: number;
}

export interface HealthInfo {
  buildingId: string;
  current: number;
  max: number;
  percentage: number;
  isCritical: boolean;
}

export class ConsumptionSystem {
  private config: GameConfig;
  private stateManager: StateManager;
  private resourceSystem: ResourceSystem;
  private subscriptions = new SubscriptionManager();

  constructor(
    config: GameConfig,
    stateManager: StateManager,
    resourceSystem: ResourceSystem
  ) {
    this.config = config;
    this.stateManager = stateManager;
    this.resourceSystem = resourceSystem;

    this.initializeBuildingHealth();
    this.setupEventListeners();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.subscriptions.dispose();
  }

  /**
   * Process consumption for a tick
   * Called by the game loop each tick
   */
  processTick(_deltaMs: number): void {
    for (const building of this.config.buildings) {
      if (!building.consumption) continue;

      const state = this.stateManager.getBuilding(building.id);
      if (!state || state.owned === 0) continue;

      this.processConsumption(building, state.owned);
    }
  }

  /**
   * Get health info for a building
   */
  getHealthInfo(buildingId: string): HealthInfo | null {
    const config = this.getBuildingConfig(buildingId);
    if (!config?.consumption) return null;

    const state = this.stateManager.getBuilding(buildingId);
    if (!state) return null;

    const current = state.health ?? config.consumption.maxHealth;
    const max = state.maxHealth ?? config.consumption.maxHealth;
    const percentage = max > 0 ? (current / max) * 100 : 0;

    return {
      buildingId,
      current,
      max,
      percentage,
      isCritical: percentage <= 25,
    };
  }

  /**
   * Get all buildings with consumption requirements
   */
  getBuildingsWithConsumption(): BuildingConfig[] {
    return this.config.buildings.filter((b) => b.consumption !== undefined);
  }

  /**
   * Calculate total consumption per tick for a resource
   */
  getTotalConsumption(resourceId: string): number {
    let total = 0;

    for (const building of this.config.buildings) {
      if (!building.consumption) continue;

      const state = this.stateManager.getBuilding(building.id);
      if (!state || state.owned === 0) continue;

      for (const consumption of building.consumption.resources) {
        if (consumption.resourceId === resourceId) {
          total += consumption.amountPerTick * state.owned;
        }
      }
    }

    return total;
  }

  /**
   * Get net production (production - consumption) for a resource
   */
  getNetProduction(resourceId: string): number {
    const production = this.resourceSystem.getProductionRate(resourceId);
    const consumption = this.getTotalConsumption(resourceId);
    return production.perSecond - consumption;
  }

  private processConsumption(config: BuildingConfig, owned: number): void {
    if (!config.consumption) return;

    const consumptionConfig = config.consumption;
    let totalHealthLoss = 0;

    for (const resource of consumptionConfig.resources) {
      const required = resource.amountPerTick * owned;
      const available = this.resourceSystem.getAmount(resource.resourceId);
      const consumed = Math.min(required, available);
      const missing = required - consumed;

      // Consume available resources
      if (consumed > 0) {
        this.resourceSystem.spendResource(
          resource.resourceId,
          consumed,
          `consumption:${config.id}`
        );
      }

      // Calculate health loss from missing resources
      if (missing > 0) {
        totalHealthLoss += missing * resource.healthLossPerMissing;

        EventBus.emit("consumption:shortage", {
          buildingId: config.id,
          resourceId: resource.resourceId,
          required,
          available,
          missing,
        });
      }

      EventBus.emit("consumption:processed", {
        buildingId: config.id,
        resourceId: resource.resourceId,
        required,
        consumed,
        missing,
      });
    }

    // Apply health changes
    if (totalHealthLoss > 0) {
      this.applyHealthLoss(config, consumptionConfig, totalHealthLoss);
    } else {
      // Heal at the same rate we would lose health when fully fed
      // This means: regen = sum of (amountPerTick * healthLossPerMissing) for all resources
      const regenRate = consumptionConfig.resources.reduce(
        (sum, r) => sum + r.amountPerTick * r.healthLossPerMissing * owned,
        0
      );
      this.applyHealthRegen(config, consumptionConfig, regenRate);
    }
  }

  private applyHealthLoss(
    config: BuildingConfig,
    consumptionConfig: ConsumptionConfig,
    damage: number
  ): void {
    const state = this.stateManager.getBuilding(config.id);
    if (!state) return;

    const currentHealth = state.health ?? consumptionConfig.maxHealth;
    const newHealth = Math.max(0, currentHealth - damage);

    this.stateManager.updateBuildingHealth(config.id, newHealth);

    EventBus.emit("building:health:changed", {
      buildingId: config.id,
      oldHealth: currentHealth,
      newHealth,
      damage,
      maxHealth: consumptionConfig.maxHealth,
    });

    // Check for death
    if (newHealth <= 0) {
      this.handleBuildingDeath(config, consumptionConfig);
    }
  }

  private applyHealthRegen(
    config: BuildingConfig,
    consumptionConfig: ConsumptionConfig,
    regenAmount: number
  ): void {
    const state = this.stateManager.getBuilding(config.id);
    if (!state || state.owned === 0) return;

    const currentHealth = state.health ?? consumptionConfig.maxHealth;
    const maxHealth = consumptionConfig.maxHealth;

    // Regenerate health at the same rate as we would lose it
    if (currentHealth < maxHealth && regenAmount > 0) {
      const newHealth = Math.min(maxHealth, currentHealth + regenAmount);
      this.stateManager.updateBuildingHealth(config.id, newHealth);

      EventBus.emit("building:health:regen", {
        buildingId: config.id,
        oldHealth: currentHealth,
        newHealth,
        healed: regenAmount,
        maxHealth,
      });
    }
  }

  private handleBuildingDeath(
    config: BuildingConfig,
    consumptionConfig: ConsumptionConfig
  ): void {
    const state = this.stateManager.getBuilding(config.id);
    if (!state || state.owned === 0) return;

    if (consumptionConfig.onDeath === "remove") {
      // Remove one building
      this.stateManager.removeBuilding(config.id, 1);

      // Reset health for remaining buildings
      if (state.owned > 1) {
        this.stateManager.updateBuildingHealth(
          config.id,
          consumptionConfig.maxHealth
        );
      }

      EventBus.emit("building:died", {
        buildingId: config.id,
        buildingName: config.name,
        remaining: state.owned - 1,
        cause: "starvation",
      });
    } else if (consumptionConfig.onDeath === "disable") {
      // Just disable production (building stays but doesn't work)
      // This would need additional state tracking
      EventBus.emit("building:disabled", {
        buildingId: config.id,
        reason: "starvation",
      });
    }
  }

  private initializeBuildingHealth(): void {
    for (const building of this.config.buildings) {
      if (!building.consumption) continue;

      const state = this.stateManager.getBuilding(building.id);
      if (state && state.owned > 0 && state.health === undefined) {
        this.stateManager.updateBuildingHealth(
          building.id,
          building.consumption.maxHealth
        );
      }
    }
  }

  private getBuildingConfig(buildingId: string): BuildingConfig | undefined {
    return this.config.buildings.find((b) => b.id === buildingId);
  }

  private setupEventListeners(): void {
    // Initialize health when a building is purchased
    this.subscriptions.subscribe("building:purchased", (data) => {
      const { buildingId } = data as { buildingId: string };
      const config = this.getBuildingConfig(buildingId);
      if (!config?.consumption) return;

      const state = this.stateManager.getBuilding(buildingId);
      if (state && state.health === undefined) {
        this.stateManager.updateBuildingHealth(
          buildingId,
          config.consumption.maxHealth
        );
      }
    });
  }
}
