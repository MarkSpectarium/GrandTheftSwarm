/**
 * ProductionProcessor - Handles all production logic for buildings
 *
 * Extracted from BuildingSystem to improve maintainability.
 * Handles both continuous and batch production modes.
 */

import { EventBus } from "../core/EventBus";
import { ResourceSystem } from "./ResourceSystem";
import { MultiplierSystem } from "../core/MultiplierSystem";
import { CurveEvaluator, getCurveEvaluator } from "../core/CurveEvaluator";
import { ProductionAccumulator } from "./ProductionAccumulator";
import type { BuildingConfig } from "../config/types";

export class ProductionProcessor {
  private resourceSystem: ResourceSystem;
  private multiplierSystem: MultiplierSystem;
  private curveEvaluator: CurveEvaluator;
  private productionAccumulator: ProductionAccumulator;

  // Tracks accumulated time for batch production buildings (in ms)
  private batchProductionTimers: Map<string, number> = new Map();

  constructor(
    resourceSystem: ResourceSystem,
    multiplierSystem: MultiplierSystem
  ) {
    this.resourceSystem = resourceSystem;
    this.multiplierSystem = multiplierSystem;
    this.curveEvaluator = getCurveEvaluator();
    this.productionAccumulator = new ProductionAccumulator(resourceSystem);
  }

  /**
   * Initialize a building for production tracking
   */
  initializeBuilding(buildingId: string, hasBatchProduction: boolean): void {
    this.productionAccumulator.initializeBuilding(buildingId);
    if (hasBatchProduction) {
      this.batchProductionTimers.set(buildingId, 0);
    }
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.productionAccumulator.clear();
    this.batchProductionTimers.clear();
  }

  /**
   * Process production for a single building
   */
  processBuilding(config: BuildingConfig, owned: number, deltaSeconds: number): void {
    const intervalMs = config.production.baseIntervalMs;
    const intervalSeconds = intervalMs / 1000;
    if (intervalSeconds <= 0) return;

    // Handle batch production mode (discrete trips/cycles)
    if (config.production.batchProduction) {
      this.processBatchProduction(config, owned, deltaSeconds * 1000);
      return;
    }

    // Standard continuous production below
    // Check if this building has inputs (converters like dingy, rice_mill)
    const hasInputs = config.production.inputs && config.production.inputs.length > 0;
    let productionEfficiency = 1.0;

    if (hasInputs) {
      // Calculate how much input we would need this tick
      // and determine what fraction we can actually produce
      productionEfficiency = this.calculateInputEfficiency(config, owned, deltaSeconds, intervalSeconds);

      // If we can't produce anything, skip this building
      if (productionEfficiency <= 0) {
        return;
      }

      // Consume inputs proportionally
      this.consumeInputs(config, owned, deltaSeconds, intervalSeconds, productionEfficiency);
    }

    for (const output of config.production.outputs) {
      let amount = output.baseAmount * owned * deltaSeconds / intervalSeconds;

      // Apply input efficiency (for converter buildings)
      amount *= productionEfficiency;

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

      // Add to accumulator and auto-flush if threshold met
      this.productionAccumulator.addAndFlush(config.id, output.resourceId, amount);
    }
  }

  /**
   * Calculate total production per second for a building
   */
  calculateProductionPerSecond(
    config: BuildingConfig,
    owned: number
  ): Record<string, number> {
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
   * Process batch production - waits for full cycle then produces all at once.
   * Used for trip-based mechanics like trading boats.
   */
  private processBatchProduction(config: BuildingConfig, owned: number, deltaMs: number): void {
    const intervalMs = config.production.baseIntervalMs;

    // Apply speed multiplier to interval
    let effectiveIntervalMs = intervalMs;
    if (config.production.speedStackId) {
      const speedMult = this.multiplierSystem.getValue(config.production.speedStackId);
      effectiveIntervalMs = intervalMs / speedMult; // Higher speed = shorter interval
    }

    // Accumulate time
    const currentTimer = this.batchProductionTimers.get(config.id) ?? 0;
    let accumulatedMs = currentTimer + deltaMs;

    // Process as many complete cycles as we can
    while (accumulatedMs >= effectiveIntervalMs) {
      // Check if we have enough inputs for a full batch
      if (config.production.inputs && config.production.inputs.length > 0) {
        if (!this.canAffordBatchInputs(config, owned)) {
          // Not enough inputs - pause the timer and wait
          break;
        }
        // Consume full batch of inputs
        this.consumeBatchInputs(config, owned);
      }

      // Produce full batch of outputs
      this.produceBatchOutputs(config, owned);

      // Subtract one cycle
      accumulatedMs -= effectiveIntervalMs;

      // Emit event for UI feedback
      EventBus.emit("building:batch:complete", {
        buildingId: config.id,
        buildingName: config.name,
      });
    }

    // Save remaining time
    this.batchProductionTimers.set(config.id, accumulatedMs);
  }

  /**
   * Check if we can afford inputs for one complete batch
   */
  private canAffordBatchInputs(config: BuildingConfig, owned: number): boolean {
    if (!config.production.inputs) return true;

    for (const input of config.production.inputs) {
      const baseAmount = typeof input.amount === "number"
        ? input.amount
        : this.curveEvaluator.evaluate(input.amount, { owned });

      const needed = baseAmount * owned;
      const available = this.resourceSystem.getAmount(input.resourceId);

      if (available < needed) {
        return false;
      }
    }
    return true;
  }

  /**
   * Consume inputs for one complete batch
   */
  private consumeBatchInputs(config: BuildingConfig, owned: number): void {
    if (!config.production.inputs) return;

    for (const input of config.production.inputs) {
      const baseAmount = typeof input.amount === "number"
        ? input.amount
        : this.curveEvaluator.evaluate(input.amount, { owned });

      const toConsume = baseAmount * owned;
      this.resourceSystem.spendResource(
        input.resourceId,
        toConsume,
        `batch:${config.id}`
      );
    }
  }

  /**
   * Produce outputs for one complete batch
   */
  private produceBatchOutputs(config: BuildingConfig, owned: number): void {
    for (const output of config.production.outputs) {
      let amount = output.baseAmount * owned;

      // Apply chance modifier
      if (output.chance !== undefined && output.chance < 1) {
        if (Math.random() > output.chance) {
          continue;
        }
      }

      // Apply multipliers
      const allProdMult = this.multiplierSystem.getValue("all_production");
      amount *= allProdMult;

      if (config.production.amountStackId) {
        const specificMult = this.multiplierSystem.getValue(config.production.amountStackId);
        amount *= specificMult;
      }

      // Add resources directly (batch mode doesn't use accumulator)
      this.resourceSystem.addResource(
        output.resourceId,
        amount,
        `batch:${config.id}`,
        false // Don't apply production multipliers again
      );
    }
  }

  /**
   * Calculate what fraction of production we can achieve based on available inputs
   */
  private calculateInputEfficiency(
    config: BuildingConfig,
    owned: number,
    deltaSeconds: number,
    intervalSeconds: number
  ): number {
    if (!config.production.inputs) return 1.0;

    let minEfficiency = 1.0;

    for (const input of config.production.inputs) {
      // Resolve amount (could be a curve reference or direct number)
      const baseAmount = typeof input.amount === "number"
        ? input.amount
        : this.curveEvaluator.evaluate(input.amount, { owned });

      const neededPerTick = baseAmount * owned * deltaSeconds / intervalSeconds;
      const available = this.resourceSystem.getAmount(input.resourceId);

      if (neededPerTick > 0) {
        const efficiency = Math.min(1.0, available / neededPerTick);
        minEfficiency = Math.min(minEfficiency, efficiency);
      }
    }

    return minEfficiency;
  }

  /**
   * Consume input resources for production
   */
  private consumeInputs(
    config: BuildingConfig,
    owned: number,
    deltaSeconds: number,
    intervalSeconds: number,
    efficiency: number
  ): void {
    if (!config.production.inputs) return;

    for (const input of config.production.inputs) {
      // Resolve amount (could be a curve reference or direct number)
      const baseAmount = typeof input.amount === "number"
        ? input.amount
        : this.curveEvaluator.evaluate(input.amount, { owned });

      const baseNeeded = baseAmount * owned * deltaSeconds / intervalSeconds;
      const actualConsume = baseNeeded * efficiency;

      if (actualConsume > 0) {
        this.resourceSystem.spendResource(
          input.resourceId,
          actualConsume,
          `production:${config.id}`
        );
      }
    }
  }
}
