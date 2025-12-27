/**
 * ResourceSystem - Manages all game resources
 *
 * Handles resource acquisition, spending, conversions,
 * and market pricing.
 */

import { EventBus } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import { MultiplierSystem } from "../core/MultiplierSystem";
import type { GameConfig, ResourceConfig, MarketPriceConfig } from "../config/types";

export interface ProductionRate {
  resourceId: string;
  perSecond: number;
  sources: Array<{ name: string; rate: number }>;
}

export class ResourceSystem {
  private config: GameConfig;
  private stateManager: StateManager;
  private multiplierSystem: MultiplierSystem;
  private productionRates: Map<string, ProductionRate> = new Map();

  constructor(
    config: GameConfig,
    stateManager: StateManager,
    multiplierSystem: MultiplierSystem
  ) {
    this.config = config;
    this.stateManager = stateManager;
    this.multiplierSystem = multiplierSystem;

    this.initializeProductionRates();
  }

  /**
   * Get resource configuration
   */
  getResourceConfig(resourceId: string): ResourceConfig | undefined {
    return this.config.resources.find((r) => r.id === resourceId);
  }

  /**
   * Get current amount of a resource
   */
  getAmount(resourceId: string): number {
    return this.stateManager.getResource(resourceId)?.current ?? 0;
  }

  /**
   * Get lifetime amount of a resource
   */
  getLifetimeAmount(resourceId: string): number {
    return this.stateManager.getResource(resourceId)?.lifetime ?? 0;
  }

  /**
   * Add resources (with multipliers applied)
   */
  addResource(
    resourceId: string,
    baseAmount: number,
    source: string,
    applyMultipliers: boolean = true
  ): number {
    let amount = baseAmount;

    if (applyMultipliers) {
      // Apply all production multiplier
      const allProdMult = this.multiplierSystem.getValue("all_production");
      amount *= allProdMult;

      // Apply specific resource multiplier if exists
      const specificStackId = `${resourceId}_production`;
      const specificMult = this.multiplierSystem.getValue(specificStackId);
      if (specificMult !== 1) {
        amount *= specificMult;
      }
    }

    this.stateManager.updateResource(resourceId, amount, source);
    return amount;
  }

  /**
   * Spend resources (returns true if successful)
   */
  spendResource(resourceId: string, amount: number, target: string): boolean {
    const current = this.getAmount(resourceId);
    if (current < amount) return false;

    this.stateManager.updateResource(resourceId, -amount, target);
    return true;
  }

  /**
   * Process manual click harvest
   */
  processClick(): number {
    const clickPower = this.multiplierSystem.getValue("click_power");
    const baseAmount = 1; // Base click gives 1 rice

    const harvested = this.addResource("rice", baseAmount * clickPower, "click");
    this.stateManager.recordClick(harvested);

    EventBus.emit("click:harvest", { amount: harvested, multiplier: clickPower });

    return harvested;
  }

  /**
   * Get production rate for a resource
   */
  getProductionRate(resourceId: string): ProductionRate {
    return (
      this.productionRates.get(resourceId) ?? {
        resourceId,
        perSecond: 0,
        sources: [],
      }
    );
  }

  /**
   * Update production rate (called when buildings/multipliers change)
   */
  updateProductionRate(resourceId: string, perSecond: number, sources: Array<{ name: string; rate: number }>): void {
    this.productionRates.set(resourceId, { resourceId, perSecond, sources });
  }

  /**
   * Get all production rates
   */
  getAllProductionRates(): Map<string, ProductionRate> {
    return new Map(this.productionRates);
  }

  /**
   * Get market price for a resource
   */
  getMarketPrice(resourceId: string): number {
    const priceConfig = this.config.marketPrices.find((p) => p.resourceId === resourceId);
    if (!priceConfig) return 0;

    let price = priceConfig.basePrice;

    // Apply sell price multiplier
    const sellMult = this.multiplierSystem.getValue("sell_price");
    price *= sellMult;

    // TODO: Apply supply/demand dynamics

    return price;
  }

  /**
   * Sell resources at market
   */
  sellResource(resourceId: string, amount: number): number {
    const current = this.getAmount(resourceId);
    const actualAmount = Math.min(amount, current);

    if (actualAmount <= 0) return 0;

    const pricePerUnit = this.getMarketPrice(resourceId);
    const totalValue = actualAmount * pricePerUnit;

    // Spend the resource
    this.spendResource(resourceId, actualAmount, "market");

    // Gain currency (dong)
    this.addResource("dong", totalValue, "market", false);

    return totalValue;
  }

  /**
   * Check if resources are unlocked/visible
   */
  isResourceUnlocked(resourceId: string): boolean {
    const state = this.stateManager.getResource(resourceId);
    return state?.unlocked ?? false;
  }

  /**
   * Get all unlocked resources
   */
  getUnlockedResources(): ResourceConfig[] {
    return this.config.resources.filter((r) => this.isResourceUnlocked(r.id));
  }

  private initializeProductionRates(): void {
    for (const resource of this.config.resources) {
      this.productionRates.set(resource.id, {
        resourceId: resource.id,
        perSecond: 0,
        sources: [],
      });
    }
  }
}
