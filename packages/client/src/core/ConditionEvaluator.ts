/**
 * ConditionEvaluator - Evaluates multiplier conditions
 *
 * Uses a strategy pattern to evaluate different condition types.
 * Add new condition types by registering new evaluators.
 */

import type { MultiplierCondition } from "../config/types";

/**
 * Context for evaluating conditions
 */
export interface ConditionContext {
  resources: Record<string, number>;
  buildings: Record<string, number>;
  upgrades: Set<string>;
  era: number;
  prestigeLevel: number;
  activeEvents: Set<string>;
  currentHour: number;
}

/**
 * Strategy interface for condition evaluators
 */
export interface ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean;
}

/**
 * Resource greater than or equal condition
 */
class ResourceGteStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const resource = condition.params.resource;
    const value = condition.params.value ?? 0;
    return (context.resources[resource!] ?? 0) >= value;
  }
}

/**
 * Resource less than or equal condition
 */
class ResourceLteStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const resource = condition.params.resource;
    const value = condition.params.value ?? 0;
    return (context.resources[resource!] ?? 0) <= value;
  }
}

/**
 * Building owned condition
 */
class BuildingOwnedStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const building = condition.params.building;
    const count = condition.params.count ?? 1;
    return (context.buildings[building!] ?? 0) >= count;
  }
}

/**
 * Upgrade purchased condition
 */
class UpgradePurchasedStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const upgrade = condition.params.upgrade;
    return context.upgrades.has(upgrade!);
  }
}

/**
 * Era greater than or equal condition
 */
class EraGteStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const era = condition.params.era ?? 1;
    return context.era >= era;
  }
}

/**
 * Era equal condition
 */
class EraEqStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const era = condition.params.era ?? 1;
    return context.era === era;
  }
}

/**
 * Time of day condition
 */
class TimeOfDayStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const start = condition.params.startHour ?? 0;
    const end = condition.params.endHour ?? 24;
    const hour = context.currentHour;

    if (start <= end) {
      return hour >= start && hour < end;
    } else {
      // Handles overnight ranges (e.g., 22-6)
      return hour >= start || hour < end;
    }
  }
}

/**
 * Event active condition
 */
class EventActiveStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const event = condition.params.event;
    return context.activeEvents.has(event!);
  }
}

/**
 * Prestige level condition
 */
class PrestigeLevelStrategy implements ConditionStrategy {
  evaluate(condition: MultiplierCondition, context: ConditionContext): boolean {
    const value = condition.params.value ?? 0;
    return context.prestigeLevel >= value;
  }
}

/**
 * Main condition evaluator using strategy pattern
 */
export class ConditionEvaluator {
  private strategies: Map<string, ConditionStrategy> = new Map();
  private context: ConditionContext;

  constructor() {
    this.context = this.createEmptyContext();
    this.registerDefaultStrategies();
  }

  /**
   * Register default condition strategies
   */
  private registerDefaultStrategies(): void {
    this.strategies.set("resource_gte", new ResourceGteStrategy());
    this.strategies.set("resource_lte", new ResourceLteStrategy());
    this.strategies.set("building_owned", new BuildingOwnedStrategy());
    this.strategies.set("upgrade_purchased", new UpgradePurchasedStrategy());
    this.strategies.set("era_gte", new EraGteStrategy());
    this.strategies.set("era_eq", new EraEqStrategy());
    this.strategies.set("time_of_day", new TimeOfDayStrategy());
    this.strategies.set("event_active", new EventActiveStrategy());
    this.strategies.set("prestige_level", new PrestigeLevelStrategy());
  }

  /**
   * Register a custom condition strategy
   */
  registerStrategy(type: string, strategy: ConditionStrategy): void {
    this.strategies.set(type, strategy);
  }

  /**
   * Update the evaluation context
   */
  updateContext(context: Partial<ConditionContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get the current context
   */
  getContext(): ConditionContext {
    return { ...this.context };
  }

  /**
   * Evaluate a condition
   */
  evaluate(condition?: MultiplierCondition): boolean {
    if (!condition) return true;

    // Handle composite conditions
    if (condition.type === "and") {
      const conditions = condition.params.conditions ?? [];
      return conditions.every((c) => this.evaluate(c));
    }

    if (condition.type === "or") {
      const conditions = condition.params.conditions ?? [];
      return conditions.some((c) => this.evaluate(c));
    }

    if (condition.type === "not") {
      return !this.evaluate(condition.params.condition);
    }

    // Use strategy for non-composite conditions
    const strategy = this.strategies.get(condition.type);
    if (!strategy) {
      console.warn(`ConditionEvaluator: Unknown condition type "${condition.type}"`);
      return true;
    }

    return strategy.evaluate(condition, this.context);
  }

  /**
   * Create empty context with defaults
   */
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

// Singleton instance
let evaluatorInstance: ConditionEvaluator | null = null;

/**
 * Get the singleton condition evaluator
 */
export function getConditionEvaluator(): ConditionEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new ConditionEvaluator();
  }
  return evaluatorInstance;
}

/**
 * Create a new condition evaluator (for testing)
 */
export function createConditionEvaluator(): ConditionEvaluator {
  return new ConditionEvaluator();
}
