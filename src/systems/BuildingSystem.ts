/**
 * BuildingSystem - Manages buildings and passive production
 *
 * Handles building purchases, production calculation,
 * and periodic resource generation.
 */

import { EventBus, SubscriptionManager } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import { ResourceSystem } from "./ResourceSystem";
import { MultiplierSystem } from "../core/MultiplierSystem";
import { CurveEvaluator, getCurveEvaluator } from "../core/CurveEvaluator";
import type { GameConfig, BuildingConfig, ResourceAmount } from "../config/types";

export interface BuildingCost {
  resourceId: string;
  amount: number;
}

export interface BuildingInfo {
  config: BuildingConfig;
  owned: number;
  unlocked: boolean;
  canAfford: boolean;
  currentCost: BuildingCost[];
  productionPerSecond: Record<string, number>;
}

export class BuildingSystem {
  private config: GameConfig;
  private stateManager: StateManager;
  private resourceSystem: ResourceSystem;
  private multiplierSystem: MultiplierSystem;
  private curveEvaluator: CurveEvaluator;

  // Track accumulated production for sub-second ticks
  private productionAccumulators: Map<string, Map<string, number>> = new Map();

  // Cleanup tracking
  private subscriptions = new SubscriptionManager();

  constructor(
    config: GameConfig,
    stateManager: StateManager,
    resourceSystem: ResourceSystem,
    multiplierSystem: MultiplierSystem
  ) {
    this.config = config;
    this.stateManager = stateManager;
    this.resourceSystem = resourceSystem;
    this.multiplierSystem = multiplierSystem;
    this.curveEvaluator = getCurveEvaluator();

    this.initializeAccumulators();
    this.setupEventListeners();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.subscriptions.dispose();
    this.productionAccumulators.clear();
  }

  /**
   * Get building configuration
   */
  getBuildingConfig(buildingId: string): BuildingConfig | undefined {
    return this.config.buildings.find((b) => b.id === buildingId);
  }

  /**
   * Get full building info for UI
   */
  getBuildingInfo(buildingId: string): BuildingInfo | null {
    const config = this.getBuildingConfig(buildingId);
    if (!config) return null;

    const state = this.stateManager.getBuilding(buildingId);
    const owned = state?.owned ?? 0;
    const unlocked = state?.unlocked ?? false;

    const currentCost = this.calculateCost(buildingId, 1);
    const canAfford = this.stateManager.canAfford(currentCost);

    const productionPerSecond = this.calculateProductionPerSecond(buildingId);

    return {
      config,
      owned,
      unlocked,
      canAfford,
      currentCost,
      productionPerSecond,
    };
  }

  /**
   * Get all buildings for current era
   */
  getAvailableBuildings(): BuildingInfo[] {
    const currentEra = this.stateManager.getCurrentEra();

    return this.config.buildings
      .filter((b) => b.unlockedAtEra <= currentEra)
      .map((b) => this.getBuildingInfo(b.id))
      .filter((info): info is BuildingInfo => info !== null);
  }

  /**
   * Calculate cost for purchasing buildings
   */
  calculateCost(buildingId: string, count: number = 1): BuildingCost[] {
    const config = this.getBuildingConfig(buildingId);
    if (!config) return [];

    const owned = this.stateManager.getBuilding(buildingId)?.owned ?? 0;
    const costs: BuildingCost[] = [];

    // For bulk purchases, sum the cost of each individual purchase
    for (const baseCost of config.baseCost) {
      let totalCost = 0;

      for (let i = 0; i < count; i++) {
        const context = { owned: owned + i };
        const multiplier = this.curveEvaluator.evaluate(config.costCurve, context);

        // Apply cost reduction multiplier
        const costReduction = this.multiplierSystem.getValue("building_cost");

        totalCost += baseCost.amount * multiplier * costReduction;
      }

      costs.push({
        resourceId: baseCost.resourceId,
        amount: Math.ceil(totalCost),
      });
    }

    return costs;
  }

  /**
   * Calculate max affordable buildings
   */
  calculateMaxAffordable(buildingId: string): number {
    let count = 0;
    let totalCosts: Map<string, number> = new Map();

    while (count < 1000) {
      // Safety limit
      const nextCost = this.calculateCost(buildingId, count + 1);

      // Check if we can afford this many
      let canAfford = true;
      for (const cost of nextCost) {
        const available = this.resourceSystem.getAmount(cost.resourceId);
        if (cost.amount > available) {
          canAfford = false;
          break;
        }
      }

      if (!canAfford) break;
      count++;
    }

    return count;
  }

  /**
   * Purchase buildings
   */
  purchase(buildingId: string, count: number = 1): boolean {
    const config = this.getBuildingConfig(buildingId);
    if (!config) return false;

    const state = this.stateManager.getBuilding(buildingId);
    if (!state?.unlocked) return false;

    // Check max owned limit
    if (config.maxOwned !== undefined) {
      const currentOwned = state.owned;
      const maxCanBuy = config.maxOwned - currentOwned;
      count = Math.min(count, maxCanBuy);
      if (count <= 0) {
        EventBus.emit("building:maxed", { buildingId });
        return false;
      }
    }

    const costs = this.calculateCost(buildingId, count);

    // Deduct costs
    if (!this.stateManager.deductCosts(costs, `building:${buildingId}`)) {
      return false;
    }

    // Add buildings
    this.stateManager.updateBuilding(buildingId, count);

    // Update production rates
    this.recalculateAllProduction();

    return true;
  }

  /**
   * Process production for a tick
   */
  processTick(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;

    for (const building of this.config.buildings) {
      const state = this.stateManager.getBuilding(building.id);
      if (!state || state.owned === 0) continue;

      this.processBuilding(building, state.owned, deltaSeconds);
    }
  }

  /**
   * Calculate total production per second for a building
   */
  calculateProductionPerSecond(buildingId: string): Record<string, number> {
    const config = this.getBuildingConfig(buildingId);
    if (!config) return {};

    const owned = this.stateManager.getBuilding(buildingId)?.owned ?? 0;
    if (owned === 0) return {};

    const production: Record<string, number> = {};
    const intervalSeconds = config.production.baseIntervalMs / 1000;

    for (const output of config.production.outputs) {
      let amount = output.baseAmount * owned;

      // Apply chance modifier
      if (output.chance !== undefined) {
        amount *= output.chance;
      }

      // Apply multipliers
      const allProdMult = this.multiplierSystem.getValue("all_production");
      amount *= allProdMult;

      // Apply specific multiplier
      if (config.production.amountStackId) {
        const specificMult = this.multiplierSystem.getValue(config.production.amountStackId);
        amount *= specificMult;
      }

      // Convert to per second
      production[output.resourceId] = amount / intervalSeconds;
    }

    return production;
  }

  /**
   * Recalculate all production rates (call after building/upgrade changes)
   */
  recalculateAllProduction(): void {
    // Aggregate production by resource
    const totalProduction: Map<string, { perSecond: number; sources: Array<{ name: string; rate: number }> }> =
      new Map();

    for (const building of this.config.buildings) {
      const state = this.stateManager.getBuilding(building.id);
      if (!state || state.owned === 0) continue;

      const production = this.calculateProductionPerSecond(building.id);

      for (const [resourceId, rate] of Object.entries(production)) {
        if (!totalProduction.has(resourceId)) {
          totalProduction.set(resourceId, { perSecond: 0, sources: [] });
        }

        const entry = totalProduction.get(resourceId)!;
        entry.perSecond += rate;
        entry.sources.push({ name: building.name, rate });
      }
    }

    // Update resource system with new rates
    for (const [resourceId, data] of totalProduction) {
      this.resourceSystem.updateProductionRate(resourceId, data.perSecond, data.sources);
    }
  }

  /**
   * Check and unlock buildings based on requirements
   */
  checkUnlocks(): void {
    const currentEra = this.stateManager.getCurrentEra();

    for (const building of this.config.buildings) {
      const state = this.stateManager.getBuilding(building.id);
      if (state?.unlocked) continue;

      // Check era requirement
      if (building.unlockedAtEra > currentEra) continue;

      // Check additional requirements
      if (building.unlockRequirements && building.unlockRequirements.length > 0) {
        const allMet = building.unlockRequirements.every((req) =>
          this.checkUnlockRequirement(req)
        );
        if (!allMet) continue;
      }

      // Unlock the building
      this.stateManager.unlockBuilding(building.id);
    }
  }

  private processBuilding(config: BuildingConfig, owned: number, deltaSeconds: number): void {
    const intervalSeconds = config.production.baseIntervalMs / 1000;

    // Check if requires active play
    if (config.production.requiresActive) {
      // Only produce if game is in foreground (handled by game loop visibility)
    }

    for (const output of config.production.outputs) {
      let amount = output.baseAmount * owned * deltaSeconds / intervalSeconds;

      // Apply chance modifier
      if (output.chance !== undefined && output.chance < 1) {
        // For per-tick chance, use probability
        if (Math.random() > output.chance) {
          continue;
        }
        // If triggered, give full amount (already factored into rate display)
      }

      // Apply multipliers
      const allProdMult = this.multiplierSystem.getValue("all_production");
      amount *= allProdMult;

      if (config.production.amountStackId) {
        const specificMult = this.multiplierSystem.getValue(config.production.amountStackId);
        amount *= specificMult;
      }

      // Apply idle efficiency if applicable
      if (!config.production.requiresActive && config.production.idleEfficiency < 1) {
        // This would be applied for offline progress
      }

      // Add to accumulator
      this.addToAccumulator(config.id, output.resourceId, amount);

      // Check if we should flush (to avoid floating point issues with small amounts)
      const accumulated = this.getAccumulated(config.id, output.resourceId);
      if (accumulated >= 0.01) {
        // Flush when we have at least 0.01
        this.flushAccumulator(config.id, output.resourceId);
      }
    }
  }

  private initializeAccumulators(): void {
    for (const building of this.config.buildings) {
      this.productionAccumulators.set(building.id, new Map());
    }
  }

  private addToAccumulator(buildingId: string, resourceId: string, amount: number): void {
    const buildingAccum = this.productionAccumulators.get(buildingId);
    if (!buildingAccum) return;

    const current = buildingAccum.get(resourceId) ?? 0;
    buildingAccum.set(resourceId, current + amount);
  }

  private getAccumulated(buildingId: string, resourceId: string): number {
    return this.productionAccumulators.get(buildingId)?.get(resourceId) ?? 0;
  }

  private flushAccumulator(buildingId: string, resourceId: string): void {
    const buildingAccum = this.productionAccumulators.get(buildingId);
    if (!buildingAccum) return;

    const amount = buildingAccum.get(resourceId) ?? 0;
    if (amount > 0) {
      this.resourceSystem.addResource(resourceId, amount, `building:${buildingId}`);
      buildingAccum.set(resourceId, 0);

      EventBus.emit("building:production", {
        buildingId,
        outputs: { [resourceId]: amount },
      });
    }
  }

  private checkUnlockRequirement(req: { type: string; params: Record<string, unknown> }): boolean {
    switch (req.type) {
      case "resource_lifetime": {
        const amount = this.resourceSystem.getLifetimeAmount(req.params.resource as string);
        return amount >= (req.params.amount as number);
      }
      case "resource_current": {
        const amount = this.resourceSystem.getAmount(req.params.resource as string);
        return amount >= (req.params.amount as number);
      }
      case "building_owned": {
        const owned = this.stateManager.getBuilding(req.params.building as string)?.owned ?? 0;
        return owned >= (req.params.count as number);
      }
      case "upgrade_purchased": {
        return this.stateManager.isUpgradePurchased(req.params.upgrade as string);
      }
      case "era_reached": {
        return this.stateManager.getCurrentEra() >= (req.params.era as number);
      }
      default:
        return false;
    }
  }

  private setupEventListeners(): void {
    // Recalculate production when multipliers change (tracked for cleanup)
    this.subscriptions.subscribe("multiplier:changed", () => {
      this.recalculateAllProduction();
    });

    // Check unlocks when resources change (tracked for cleanup)
    this.subscriptions.subscribe("resource:changed", () => {
      this.checkUnlocks();
    });

    // Check unlocks when buildings are purchased (tracked for cleanup)
    this.subscriptions.subscribe("building:purchased", () => {
      this.checkUnlocks();
    });
  }
}
