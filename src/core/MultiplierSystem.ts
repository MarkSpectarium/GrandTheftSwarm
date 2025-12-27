/**
 * MultiplierSystem - Manages all game multipliers and bonuses
 *
 * Tracks multiplier stacks, calculates combined values,
 * and handles temporary/conditional multipliers.
 */

import { EventBus } from "./EventBus";
import type {
  MultiplierStackConfig,
  MultiplierSourceConfig,
  StackType,
  MultiplierCondition,
} from "../config/types";

export interface ActiveMultiplier {
  id: string;
  stackId: string;
  value: number;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  temporary: boolean;
  expiresAt?: number;
  condition?: MultiplierCondition;
}

export interface MultiplierStack {
  config: MultiplierStackConfig;
  sources: ActiveMultiplier[];
  cachedValue: number;
  isDirty: boolean;
}

export interface ConditionContext {
  resources: Record<string, number>;
  buildings: Record<string, number>;
  upgrades: Set<string>;
  era: number;
  prestigeLevel: number;
  activeEvents: Set<string>;
  currentHour: number;
}

export class MultiplierSystem {
  private stacks: Map<string, MultiplierStack> = new Map();
  private conditionContext: ConditionContext;

  constructor(stackConfigs: MultiplierStackConfig[]) {
    this.conditionContext = this.createEmptyContext();
    this.initializeStacks(stackConfigs);
  }

  /**
   * Initialize stacks from configuration
   */
  initializeStacks(configs: MultiplierStackConfig[]): void {
    this.stacks.clear();

    for (const config of configs) {
      this.stacks.set(config.id, {
        config,
        sources: [],
        cachedValue: config.baseValue,
        isDirty: false,
      });
    }
  }

  /**
   * Add a multiplier source to a stack
   */
  addMultiplier(source: MultiplierSourceConfig): void {
    const stack = this.stacks.get(source.stackId);
    if (!stack) {
      console.warn(`MultiplierSystem: Unknown stack "${source.stackId}"`);
      return;
    }

    // Check if source already exists
    const existingIndex = stack.sources.findIndex((s) => s.id === source.id);
    if (existingIndex >= 0) {
      // Update existing
      stack.sources[existingIndex] = this.createActiveMultiplier(source);
    } else {
      // Add new
      stack.sources.push(this.createActiveMultiplier(source));
    }

    stack.isDirty = true;
    const newValue = this.recalculateStack(stack);

    EventBus.emit("multiplier:added", {
      stackId: source.stackId,
      sourceId: source.id,
      value: source.value,
    });

    EventBus.emit("multiplier:changed", {
      stackId: source.stackId,
      oldValue: stack.cachedValue,
      newValue,
    });
  }

  /**
   * Remove a multiplier source from a stack
   */
  removeMultiplier(stackId: string, sourceId: string): void {
    const stack = this.stacks.get(stackId);
    if (!stack) return;

    const index = stack.sources.findIndex((s) => s.id === sourceId);
    if (index < 0) return;

    stack.sources.splice(index, 1);
    stack.isDirty = true;

    const oldValue = stack.cachedValue;
    const newValue = this.recalculateStack(stack);

    EventBus.emit("multiplier:removed", { stackId, sourceId });
    EventBus.emit("multiplier:changed", { stackId, oldValue, newValue });
  }

  /**
   * Get the final calculated value for a stack
   */
  getValue(stackId: string): number {
    const stack = this.stacks.get(stackId);
    if (!stack) {
      console.warn(`MultiplierSystem: Unknown stack "${stackId}"`);
      return 1;
    }

    if (stack.isDirty) {
      this.recalculateStack(stack);
    }

    return stack.cachedValue;
  }

  /**
   * Get all active sources for a stack (for UI display)
   */
  getStackSources(stackId: string): ActiveMultiplier[] {
    const stack = this.stacks.get(stackId);
    if (!stack) return [];

    return stack.sources.filter((s) => this.isConditionMet(s.condition));
  }

  /**
   * Get breakdown of a stack's value (for tooltips)
   */
  getStackBreakdown(stackId: string): { base: number; sources: Array<{ name: string; value: number }> } {
    const stack = this.stacks.get(stackId);
    if (!stack) {
      return { base: 1, sources: [] };
    }

    const activeSources = stack.sources
      .filter((s) => this.isConditionMet(s.condition))
      .map((s) => ({ name: s.sourceName, value: s.value }));

    return {
      base: stack.config.baseValue,
      sources: activeSources,
    };
  }

  /**
   * Update the condition context (called when game state changes)
   */
  updateConditionContext(context: Partial<ConditionContext>): void {
    this.conditionContext = { ...this.conditionContext, ...context };

    // Mark all stacks with conditional sources as dirty
    for (const stack of this.stacks.values()) {
      if (stack.sources.some((s) => s.condition)) {
        stack.isDirty = true;
      }
    }
  }

  /**
   * Process expired temporary multipliers
   */
  processExpiredMultipliers(currentTime: number): void {
    for (const stack of this.stacks.values()) {
      const expired = stack.sources.filter(
        (s) => s.temporary && s.expiresAt && s.expiresAt <= currentTime
      );

      for (const source of expired) {
        this.removeMultiplier(stack.config.id, source.id);
      }
    }
  }

  /**
   * Get all stacks (for debugging/UI)
   */
  getAllStacks(): Map<string, MultiplierStack> {
    return new Map(this.stacks);
  }

  private createActiveMultiplier(source: MultiplierSourceConfig): ActiveMultiplier {
    return {
      id: source.id,
      stackId: source.stackId,
      value: source.value,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      temporary: source.temporary ?? false,
      expiresAt: source.durationMs
        ? Date.now() + source.durationMs
        : undefined,
      condition: source.condition,
    };
  }

  private recalculateStack(stack: MultiplierStack): number {
    const { config, sources } = stack;

    // Filter to active sources (conditions met, not expired)
    const activeSources = sources.filter((s) => {
      if (s.temporary && s.expiresAt && s.expiresAt <= Date.now()) {
        return false;
      }
      return this.isConditionMet(s.condition);
    });

    let value = this.calculateStackValue(config.stackType, config.baseValue, activeSources);

    // Apply min/max caps
    if (config.minValue !== undefined) {
      value = Math.max(config.minValue, value);
    }
    if (config.maxValue !== undefined) {
      value = Math.min(config.maxValue, value);
    }

    stack.cachedValue = value;
    stack.isDirty = false;

    return value;
  }

  private calculateStackValue(
    stackType: StackType,
    baseValue: number,
    sources: ActiveMultiplier[]
  ): number {
    if (sources.length === 0) {
      return baseValue;
    }

    switch (stackType) {
      case "additive": {
        // Final = Base + (Bonus1 + Bonus2 + Bonus3)
        const sum = sources.reduce((acc, s) => acc + s.value, 0);
        return baseValue + sum;
      }

      case "multiplicative": {
        // Final = Base * Bonus1 * Bonus2 * Bonus3
        return sources.reduce((acc, s) => acc * s.value, baseValue);
      }

      case "diminishing": {
        // Final = 1 - ((1-Bonus1) * (1-Bonus2) * (1-Bonus3))
        // Used for percentage caps (e.g., cost reduction)
        const remaining = sources.reduce((acc, s) => acc * (1 - s.value), 1);
        return 1 - remaining;
      }

      default:
        return baseValue;
    }
  }

  private isConditionMet(condition?: MultiplierCondition): boolean {
    if (!condition) return true;

    const ctx = this.conditionContext;

    switch (condition.type) {
      case "resource_gte":
        return (ctx.resources[condition.params.resource!] ?? 0) >= (condition.params.value ?? 0);

      case "resource_lte":
        return (ctx.resources[condition.params.resource!] ?? 0) <= (condition.params.value ?? 0);

      case "building_owned":
        return (ctx.buildings[condition.params.building!] ?? 0) >= (condition.params.count ?? 1);

      case "upgrade_purchased":
        return ctx.upgrades.has(condition.params.upgrade!);

      case "era_gte":
        return ctx.era >= (condition.params.era ?? 1);

      case "era_eq":
        return ctx.era === (condition.params.era ?? 1);

      case "time_of_day": {
        const start = condition.params.startHour ?? 0;
        const end = condition.params.endHour ?? 24;
        const hour = ctx.currentHour;
        if (start <= end) {
          return hour >= start && hour < end;
        } else {
          // Handles overnight ranges (e.g., 22-6)
          return hour >= start || hour < end;
        }
      }

      case "event_active":
        return ctx.activeEvents.has(condition.params.event!);

      case "prestige_level":
        return ctx.prestigeLevel >= (condition.params.value ?? 0);

      case "and":
        return (condition.params.conditions ?? []).every((c) => this.isConditionMet(c));

      case "or":
        return (condition.params.conditions ?? []).some((c) => this.isConditionMet(c));

      case "not":
        return !this.isConditionMet(condition.params.condition);

      default:
        return true;
    }
  }

  private createEmptyContext(): ConditionContext {
    return {
      resources: {},
      buildings: {},
      upgrades: new Set(),
      era: 1,
      prestigeLevel: 0,
      activeEvents: new Set(),
      currentHour: new Date().getHours(),
    };
  }
}
