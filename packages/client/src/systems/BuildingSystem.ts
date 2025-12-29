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
import { UnlockEvaluator, type UnlockRequirement } from "./UnlockEvaluator";
import { ProductionProcessor } from "./ProductionProcessor";
import type { GameConfig, BuildingConfig } from "../config/types";
import {
  buildingHealthConfig,
  buildingCalculationConfig,
} from "../config/balance/buildings.balance.config";

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
  /** Health info for buildings with consumption (undefined if no consumption) */
  health?: {
    current: number;
    max: number;
    percentage: number;
    isCritical: boolean;
  };
  /** Consumption per tick (undefined if no consumption) */
  consumptionPerTick?: Record<string, number>;
  /** Preview info for before purchasing / showing what building does */
  preview: {
    /** Production output description (per unit) */
    outputsPerUnit: Array<{ resourceId: string; amount: number; perSecond: number }>;
    /** Production input description (per unit) - for converter buildings */
    inputsPerUnit?: Array<{ resourceId: string; amount: number; perCycle: number }>;
    /** Cycle duration in seconds (for batch production) */
    cycleDurationSeconds?: number;
    /** Is this batch production (discrete trips) */
    isBatchProduction: boolean;
    /** Effects description */
    effects?: string[];
  };
  /** Info about what the next purchase would provide */
  nextPurchase: {
    /** Production increase per second from buying one more */
    productionIncrease: Record<string, number>;
    /** Cost for the next purchase */
    nextCost: BuildingCost[];
  };
  /** Resource limit configuration for transport buildings */
  resourceLimitConfig?: {
    /** Current resource limit (0-1, undefined means no limit) */
    currentLimit: number;
    /** Whether this building supports resource limits */
    hasSlider: boolean;
  };
}

export class BuildingSystem {
  private config: GameConfig;
  private stateManager: StateManager;
  private resourceSystem: ResourceSystem;
  private multiplierSystem: MultiplierSystem;
  private curveEvaluator: CurveEvaluator;
  private unlockEvaluator: UnlockEvaluator;
  private productionProcessor: ProductionProcessor;

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
    this.unlockEvaluator = new UnlockEvaluator(stateManager, resourceSystem);

    // Create production processor with resource limit getter
    this.productionProcessor = new ProductionProcessor(
      resourceSystem,
      multiplierSystem,
      (buildingId: string) => this.getResourceLimit(buildingId)
    );

    // Initialize production tracking for all buildings
    for (const building of config.buildings) {
      const hasBatchProduction = building.production?.batchProduction ?? false;
      this.productionProcessor.initializeBuilding(building.id, hasBatchProduction);
    }

    this.setupEventListeners();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.subscriptions.dispose();
    this.productionProcessor.dispose();
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

    // Calculate health info for buildings with consumption
    let health: BuildingInfo["health"] = undefined;
    let consumptionPerTick: BuildingInfo["consumptionPerTick"] = undefined;

    if (config.consumption && owned > 0) {
      const currentHealth = state?.health ?? config.consumption.maxHealth;
      const maxHealth = config.consumption.maxHealth;
      const percentage = maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 0;

      health = {
        current: currentHealth,
        max: maxHealth,
        percentage,
        isCritical: percentage <= buildingHealthConfig.criticalThresholdPercent,
      };

      // Calculate consumption per tick
      consumptionPerTick = {};
      for (const resource of config.consumption.resources) {
        consumptionPerTick[resource.resourceId] = resource.amountPerTick * owned;
      }
    }

    // Build preview info
    const preview = this.buildPreviewInfo(config);

    // Calculate next purchase info
    const nextPurchase = this.buildNextPurchaseInfo(config, owned);

    // Build resource limit config for transport buildings
    const resourceLimitConfig = this.buildResourceLimitConfig(config, state);

    return {
      config,
      owned,
      unlocked,
      canAfford,
      currentCost,
      productionPerSecond,
      health,
      consumptionPerTick,
      preview,
      nextPurchase,
      resourceLimitConfig,
    };
  }

  /**
   * Build preview info for a building (what it does per unit)
   */
  private buildPreviewInfo(config: BuildingConfig): BuildingInfo["preview"] {
    const intervalSeconds = config.production.baseIntervalMs / 1000;
    const isBatchProduction = config.production.batchProduction ?? false;

    // Calculate outputs per unit
    const outputsPerUnit = config.production.outputs.map((output) => {
      let amount = output.baseAmount;

      // Apply chance modifier for display
      if (output.chance !== undefined) {
        amount *= output.chance;
      }

      return {
        resourceId: output.resourceId,
        amount: output.baseAmount, // Raw amount per cycle
        perSecond: amount / intervalSeconds, // Rate per second
      };
    });

    // Calculate inputs per unit (for converter buildings)
    let inputsPerUnit: BuildingInfo["preview"]["inputsPerUnit"];
    if (config.production.inputs && config.production.inputs.length > 0) {
      inputsPerUnit = config.production.inputs.map((input) => {
        const amount = typeof input.amount === "number"
          ? input.amount
          : 0; // For curve-based amounts, just show 0 (would need evaluation)

        return {
          resourceId: input.resourceId,
          amount,
          perCycle: amount,
        };
      });
    }

    // Build effects descriptions
    let effects: string[] | undefined;
    if (config.effects && config.effects.length > 0) {
      effects = config.effects.map((effect) => {
        const value = effect.valuePerUnit ?? effect.value;
        const percent = Math.round(value * 100);
        return `+${percent}% ${effect.stackId.replace(/_/g, " ")}`;
      });
    }

    if (config.specialEffects && config.specialEffects.length > 0) {
      effects = effects ?? [];
      for (const effect of config.specialEffects) {
        effects.push(effect.description);
      }
    }

    return {
      outputsPerUnit,
      inputsPerUnit,
      cycleDurationSeconds: isBatchProduction ? intervalSeconds : undefined,
      isBatchProduction,
      effects,
    };
  }

  /**
   * Build next purchase info (what buying one more would provide)
   */
  private buildNextPurchaseInfo(
    config: BuildingConfig,
    currentOwned: number
  ): BuildingInfo["nextPurchase"] {
    // Calculate production increase from one more building
    const productionIncrease = this.productionProcessor.calculateProductionPerSecond(
      config,
      1 // Calculate for just 1 unit
    );

    // Calculate cost for next purchase (after current owned)
    // We need to calculate cost as if we already own 'currentOwned'
    const nextCost = this.calculateCostForNth(config, currentOwned);

    return {
      productionIncrease,
      nextCost,
    };
  }

  /**
   * Calculate cost for the Nth building (0-indexed)
   */
  private calculateCostForNth(config: BuildingConfig, n: number): BuildingCost[] {
    const hasSubsequentCost = config.subsequentCost && config.subsequentCost.length > 0;
    const costReduction = this.multiplierSystem.getValue("building_cost");
    const costs: BuildingCost[] = [];

    if (hasSubsequentCost) {
      if (n === 0) {
        // First purchase uses baseCost
        for (const baseCost of config.baseCost) {
          const baseAmount = typeof baseCost.amount === "number"
            ? baseCost.amount
            : this.curveEvaluator.evaluate(baseCost.amount, { owned: 0 });

          costs.push({
            resourceId: baseCost.resourceId,
            amount: Math.ceil(baseAmount * costReduction),
          });
        }
      } else {
        // Subsequent purchases use subsequentCost with curve scaling
        const subsequentIndex = n - 1;
        const context = { owned: subsequentIndex };
        const multiplier = this.curveEvaluator.evaluate(config.costCurve, context);

        for (const subCost of config.subsequentCost!) {
          const baseAmount = typeof subCost.amount === "number"
            ? subCost.amount
            : this.curveEvaluator.evaluate(subCost.amount, { owned: 0 });

          costs.push({
            resourceId: subCost.resourceId,
            amount: Math.ceil(baseAmount * multiplier * costReduction),
          });
        }
      }
    } else {
      // Standard cost calculation
      const context = { owned: n };
      const multiplier = this.curveEvaluator.evaluate(config.costCurve, context);

      for (const baseCost of config.baseCost) {
        const baseAmount = typeof baseCost.amount === "number"
          ? baseCost.amount
          : this.curveEvaluator.evaluate(baseCost.amount, { owned: 0 });

        costs.push({
          resourceId: baseCost.resourceId,
          amount: Math.ceil(baseAmount * multiplier * costReduction),
        });
      }
    }

    return costs;
  }

  /**
   * Build resource limit config for transport buildings
   */
  private buildResourceLimitConfig(
    config: BuildingConfig,
    state: { resourceLimit?: number } | undefined
  ): BuildingInfo["resourceLimitConfig"] {
    // Only transport category buildings with inputs get the slider
    if (config.category !== "transport") {
      return undefined;
    }

    // Must have production inputs to have a resource limit slider
    if (!config.production.inputs || config.production.inputs.length === 0) {
      return undefined;
    }

    return {
      currentLimit: state?.resourceLimit ?? 1.0, // Default to 100%
      hasSlider: true,
    };
  }

  /**
   * Set the resource limit for a building
   */
  setResourceLimit(buildingId: string, limit: number): void {
    const clampedLimit = Math.max(0, Math.min(1, limit));
    this.stateManager.updateBuildingResourceLimit(buildingId, clampedLimit);
  }

  /**
   * Get the resource limit for a building
   */
  getResourceLimit(buildingId: string): number {
    const state = this.stateManager.getBuilding(buildingId);
    return state?.resourceLimit ?? 1.0;
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

    // Check if this building has separate costs for first vs subsequent purchases
    const hasSubsequentCost = config.subsequentCost && config.subsequentCost.length > 0;

    if (hasSubsequentCost) {
      return this.calculateCostWithSubsequent(config, owned, count);
    }

    // Standard cost calculation
    const costs: BuildingCost[] = [];

    // For bulk purchases, sum the cost of each individual purchase
    for (const baseCost of config.baseCost) {
      let totalCost = 0;

      // Resolve base amount (could be a curve reference or direct number)
      const baseAmount = typeof baseCost.amount === "number"
        ? baseCost.amount
        : this.curveEvaluator.evaluate(baseCost.amount, { owned: 0 });

      for (let i = 0; i < count; i++) {
        const context = { owned: owned + i };
        const multiplier = this.curveEvaluator.evaluate(config.costCurve, context);

        // Apply cost reduction multiplier
        const costReduction = this.multiplierSystem.getValue("building_cost");

        totalCost += baseAmount * multiplier * costReduction;
      }

      costs.push({
        resourceId: baseCost.resourceId,
        amount: Math.ceil(totalCost),
      });
    }

    return costs;
  }

  /**
   * Calculate cost for buildings with different first/subsequent costs.
   * First purchase uses baseCost, subsequent purchases use subsequentCost with curve scaling.
   */
  private calculateCostWithSubsequent(
    config: BuildingConfig,
    owned: number,
    count: number
  ): BuildingCost[] {
    const costMap = new Map<string, number>();
    const costReduction = this.multiplierSystem.getValue("building_cost");

    for (let i = 0; i < count; i++) {
      const purchaseIndex = owned + i;

      if (purchaseIndex === 0) {
        // First purchase uses baseCost (no curve multiplier for first)
        for (const baseCost of config.baseCost) {
          const baseAmount = typeof baseCost.amount === "number"
            ? baseCost.amount
            : this.curveEvaluator.evaluate(baseCost.amount, { owned: 0 });

          const currentTotal = costMap.get(baseCost.resourceId) ?? 0;
          costMap.set(baseCost.resourceId, currentTotal + baseAmount * costReduction);
        }
      } else {
        // Subsequent purchases use subsequentCost with curve scaling
        // The curve is evaluated based on how many subsequent purchases have been made
        // (owned - 1 for the first subsequent, owned for the second, etc.)
        const subsequentIndex = purchaseIndex - 1; // 0-indexed for subsequent purchases
        const context = { owned: subsequentIndex };
        const multiplier = this.curveEvaluator.evaluate(config.costCurve, context);

        for (const subCost of config.subsequentCost!) {
          const baseAmount = typeof subCost.amount === "number"
            ? subCost.amount
            : this.curveEvaluator.evaluate(subCost.amount, { owned: 0 });

          const currentTotal = costMap.get(subCost.resourceId) ?? 0;
          costMap.set(subCost.resourceId, currentTotal + baseAmount * multiplier * costReduction);
        }
      }
    }

    // Convert map to array
    const costs: BuildingCost[] = [];
    for (const [resourceId, amount] of costMap) {
      costs.push({
        resourceId,
        amount: Math.ceil(amount),
      });
    }

    return costs;
  }

  /**
   * Calculate max affordable buildings
   */
  calculateMaxAffordable(buildingId: string): number {
    let count = 0;

    while (count < buildingCalculationConfig.maxAffordableIterations) {
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
   * Process production for a tick (delegates to ProductionProcessor)
   */
  processTick(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;

    for (const building of this.config.buildings) {
      const state = this.stateManager.getBuilding(building.id);
      if (!state || state.owned === 0) continue;

      this.productionProcessor.processBuilding(building, state.owned, deltaSeconds);
    }
  }

  /**
   * Calculate total production per second for a building (delegates to ProductionProcessor)
   */
  calculateProductionPerSecond(buildingId: string): Record<string, number> {
    const config = this.getBuildingConfig(buildingId);
    if (!config) return {};

    const owned = this.stateManager.getBuilding(buildingId)?.owned ?? 0;
    return this.productionProcessor.calculateProductionPerSecond(config, owned);
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

      // Check additional requirements using UnlockEvaluator
      if (building.unlockRequirements && building.unlockRequirements.length > 0) {
        const requirements = building.unlockRequirements as UnlockRequirement[];
        if (!this.unlockEvaluator.evaluateAll(requirements)) continue;
      }

      // Unlock the building
      this.stateManager.unlockBuilding(building.id);
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
