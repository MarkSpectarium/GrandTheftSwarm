/**
 * UnlockEvaluator - Evaluates unlock requirements for buildings and upgrades
 *
 * Uses a strategy pattern to evaluate different requirement types.
 * Add new requirement types by registering new evaluators.
 */

import { StateManager } from "../state/StateManager";
import { ResourceSystem } from "./ResourceSystem";

/**
 * Unlock requirement structure
 */
export interface UnlockRequirement {
  type: string;
  params: Record<string, unknown>;
  description?: string;
}

/**
 * Context for evaluating requirements
 */
export interface UnlockContext {
  stateManager: StateManager;
  resourceSystem: ResourceSystem;
}

/**
 * Strategy interface for requirement evaluators
 */
export interface RequirementStrategy {
  evaluate(requirement: UnlockRequirement, context: UnlockContext): boolean;
}

/**
 * Resource lifetime requirement
 */
class ResourceLifetimeStrategy implements RequirementStrategy {
  evaluate(req: UnlockRequirement, ctx: UnlockContext): boolean {
    const resourceId = req.params.resource as string;
    const requiredAmount = req.params.amount as number;
    const currentAmount = ctx.resourceSystem.getLifetimeAmount(resourceId);
    return currentAmount >= requiredAmount;
  }
}

/**
 * Current resource amount requirement
 */
class ResourceCurrentStrategy implements RequirementStrategy {
  evaluate(req: UnlockRequirement, ctx: UnlockContext): boolean {
    const resourceId = req.params.resource as string;
    const requiredAmount = req.params.amount as number;
    const currentAmount = ctx.resourceSystem.getAmount(resourceId);
    return currentAmount >= requiredAmount;
  }
}

/**
 * Building owned requirement
 */
class BuildingOwnedStrategy implements RequirementStrategy {
  evaluate(req: UnlockRequirement, ctx: UnlockContext): boolean {
    const buildingId = req.params.building as string;
    const requiredCount = req.params.count as number;
    const owned = ctx.stateManager.getBuilding(buildingId)?.owned ?? 0;
    return owned >= requiredCount;
  }
}

/**
 * Upgrade purchased requirement
 */
class UpgradePurchasedStrategy implements RequirementStrategy {
  evaluate(req: UnlockRequirement, ctx: UnlockContext): boolean {
    const upgradeId = req.params.upgrade as string;
    return ctx.stateManager.isUpgradePurchased(upgradeId);
  }
}

/**
 * Era reached requirement
 */
class EraReachedStrategy implements RequirementStrategy {
  evaluate(req: UnlockRequirement, ctx: UnlockContext): boolean {
    const requiredEra = req.params.era as number;
    return ctx.stateManager.getCurrentEra() >= requiredEra;
  }
}

/**
 * Total clicks requirement
 */
class TotalClicksStrategy implements RequirementStrategy {
  evaluate(req: UnlockRequirement, ctx: UnlockContext): boolean {
    const requiredClicks = req.params.count as number;
    const state = ctx.stateManager.getState();
    return state.statistics.totalClicks >= requiredClicks;
  }
}

/**
 * Play time requirement
 */
class PlayTimeStrategy implements RequirementStrategy {
  evaluate(req: UnlockRequirement, ctx: UnlockContext): boolean {
    const requiredMs = req.params.milliseconds as number;
    const state = ctx.stateManager.getState();
    return state.statistics.totalPlayTimeMs >= requiredMs;
  }
}

/**
 * Main unlock evaluator using strategy pattern
 */
export class UnlockEvaluator {
  private strategies: Map<string, RequirementStrategy> = new Map();
  private context: UnlockContext;

  constructor(stateManager: StateManager, resourceSystem: ResourceSystem) {
    this.context = { stateManager, resourceSystem };
    this.registerDefaultStrategies();
  }

  /**
   * Register default requirement strategies
   */
  private registerDefaultStrategies(): void {
    this.strategies.set("resource_lifetime", new ResourceLifetimeStrategy());
    this.strategies.set("resource_current", new ResourceCurrentStrategy());
    this.strategies.set("building_owned", new BuildingOwnedStrategy());
    this.strategies.set("upgrade_purchased", new UpgradePurchasedStrategy());
    this.strategies.set("era_reached", new EraReachedStrategy());
    this.strategies.set("total_clicks", new TotalClicksStrategy());
    this.strategies.set("play_time", new PlayTimeStrategy());
  }

  /**
   * Register a custom requirement strategy
   */
  registerStrategy(type: string, strategy: RequirementStrategy): void {
    this.strategies.set(type, strategy);
  }

  /**
   * Evaluate a single requirement
   */
  evaluate(requirement: UnlockRequirement): boolean {
    const strategy = this.strategies.get(requirement.type);

    if (!strategy) {
      console.warn(`UnlockEvaluator: Unknown requirement type "${requirement.type}"`);
      return false;
    }

    return strategy.evaluate(requirement, this.context);
  }

  /**
   * Evaluate all requirements (AND logic)
   */
  evaluateAll(requirements: UnlockRequirement[]): boolean {
    if (requirements.length === 0) return true;
    return requirements.every((req) => this.evaluate(req));
  }

  /**
   * Evaluate any requirement (OR logic)
   */
  evaluateAny(requirements: UnlockRequirement[]): boolean {
    if (requirements.length === 0) return true;
    return requirements.some((req) => this.evaluate(req));
  }

  /**
   * Get progress for a requirement (0-1)
   */
  getProgress(requirement: UnlockRequirement): number {
    switch (requirement.type) {
      case "resource_lifetime": {
        const resourceId = requirement.params.resource as string;
        const required = requirement.params.amount as number;
        const current = this.context.resourceSystem.getLifetimeAmount(resourceId);
        return Math.min(1, current / required);
      }

      case "resource_current": {
        const resourceId = requirement.params.resource as string;
        const required = requirement.params.amount as number;
        const current = this.context.resourceSystem.getAmount(resourceId);
        return Math.min(1, current / required);
      }

      case "building_owned": {
        const buildingId = requirement.params.building as string;
        const required = requirement.params.count as number;
        const owned = this.context.stateManager.getBuilding(buildingId)?.owned ?? 0;
        return Math.min(1, owned / required);
      }

      case "era_reached": {
        const required = requirement.params.era as number;
        const current = this.context.stateManager.getCurrentEra();
        return current >= required ? 1 : 0;
      }

      default:
        return this.evaluate(requirement) ? 1 : 0;
    }
  }
}
