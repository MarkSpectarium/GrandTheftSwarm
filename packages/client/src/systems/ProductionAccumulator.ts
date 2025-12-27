/**
 * ProductionAccumulator - Handles sub-second production buffering
 *
 * Accumulates small production amounts and flushes them when they
 * reach a threshold to avoid floating point issues with tiny amounts.
 */

import { EventBus } from "../core/EventBus";
import { ResourceSystem } from "./ResourceSystem";

export interface ProductionFlushResult {
  buildingId: string;
  resourceId: string;
  amount: number;
}

export class ProductionAccumulator {
  private accumulators: Map<string, Map<string, number>> = new Map();
  private resourceSystem: ResourceSystem;

  // Minimum amount before flushing to resources
  private readonly flushThreshold: number;

  constructor(resourceSystem: ResourceSystem, flushThreshold: number = 0.01) {
    this.resourceSystem = resourceSystem;
    this.flushThreshold = flushThreshold;
  }

  /**
   * Initialize accumulator for a building
   */
  initializeBuilding(buildingId: string): void {
    if (!this.accumulators.has(buildingId)) {
      this.accumulators.set(buildingId, new Map());
    }
  }

  /**
   * Add production amount to accumulator
   */
  add(buildingId: string, resourceId: string, amount: number): void {
    let buildingAccum = this.accumulators.get(buildingId);
    if (!buildingAccum) {
      buildingAccum = new Map();
      this.accumulators.set(buildingId, buildingAccum);
    }

    const current = buildingAccum.get(resourceId) ?? 0;
    buildingAccum.set(resourceId, current + amount);
  }

  /**
   * Get accumulated amount for a building/resource pair
   */
  getAccumulated(buildingId: string, resourceId: string): number {
    return this.accumulators.get(buildingId)?.get(resourceId) ?? 0;
  }

  /**
   * Check if accumulator should be flushed
   */
  shouldFlush(buildingId: string, resourceId: string): boolean {
    return this.getAccumulated(buildingId, resourceId) >= this.flushThreshold;
  }

  /**
   * Flush accumulated production to resource system
   */
  flush(buildingId: string, resourceId: string): ProductionFlushResult | null {
    const buildingAccum = this.accumulators.get(buildingId);
    if (!buildingAccum) return null;

    const amount = buildingAccum.get(resourceId) ?? 0;
    if (amount <= 0) return null;

    this.resourceSystem.addResource(resourceId, amount, `building:${buildingId}`);
    buildingAccum.set(resourceId, 0);

    EventBus.emit("building:production", {
      buildingId,
      outputs: { [resourceId]: amount },
    });

    return { buildingId, resourceId, amount };
  }

  /**
   * Add and auto-flush if threshold met
   */
  addAndFlush(buildingId: string, resourceId: string, amount: number): ProductionFlushResult | null {
    this.add(buildingId, resourceId, amount);

    if (this.shouldFlush(buildingId, resourceId)) {
      return this.flush(buildingId, resourceId);
    }

    return null;
  }

  /**
   * Flush all accumulators (e.g., on game pause or save)
   */
  flushAll(): ProductionFlushResult[] {
    const results: ProductionFlushResult[] = [];

    for (const [buildingId, resourceMap] of this.accumulators) {
      for (const resourceId of resourceMap.keys()) {
        const result = this.flush(buildingId, resourceId);
        if (result) results.push(result);
      }
    }

    return results;
  }

  /**
   * Clear all accumulators
   */
  clear(): void {
    this.accumulators.clear();
  }

  /**
   * Get all building IDs with accumulators
   */
  getBuildingIds(): string[] {
    return Array.from(this.accumulators.keys());
  }
}
