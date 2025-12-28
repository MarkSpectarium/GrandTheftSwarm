/**
 * UpgradeSystem - Manages one-time purchasable upgrades
 *
 * Handles upgrade purchases, unlock checking, and applying
 * multiplier effects from upgrades to the game.
 */

import { EventBus, SubscriptionManager } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import { ResourceSystem } from "./ResourceSystem";
import { MultiplierSystem } from "../core/MultiplierSystem";
import { UnlockEvaluator, type UnlockRequirement } from "./UnlockEvaluator";
import type { GameConfig, UpgradeConfig, MultiplierEffect } from "../config/types";

export interface UpgradeCost {
  resourceId: string;
  amount: number;
}

export interface UpgradeInfo {
  config: UpgradeConfig;
  purchased: boolean;
  unlocked: boolean;
  visible: boolean;
  canAfford: boolean;
  currentCost: UpgradeCost[];
}

export class UpgradeSystem {
  private config: GameConfig;
  private stateManager: StateManager;
  private resourceSystem: ResourceSystem;
  private multiplierSystem: MultiplierSystem;
  private unlockEvaluator: UnlockEvaluator;

  // Track which upgrades have had their effects applied
  private appliedUpgrades: Set<string> = new Set();

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
    this.unlockEvaluator = new UnlockEvaluator(stateManager, resourceSystem);

    this.setupEventListeners();

    // Re-apply effects from already purchased upgrades (for loaded games)
    this.reapplyPurchasedUpgradeEffects();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.subscriptions.dispose();
    this.appliedUpgrades.clear();
  }

  /**
   * Get upgrade configuration
   */
  getUpgradeConfig(upgradeId: string): UpgradeConfig | undefined {
    return this.config.upgrades.find((u) => u.id === upgradeId);
  }

  /**
   * Get full upgrade info for UI
   */
  getUpgradeInfo(upgradeId: string): UpgradeInfo | null {
    const config = this.getUpgradeConfig(upgradeId);
    if (!config) return null;

    const purchased = this.stateManager.isUpgradePurchased(upgradeId);
    const unlocked = this.isUnlocked(upgradeId);
    const visible = this.isVisible(upgradeId);
    const currentCost = this.calculateCost(upgradeId);
    const canAfford = !purchased && this.stateManager.canAfford(currentCost);

    return {
      config,
      purchased,
      unlocked,
      visible,
      canAfford,
      currentCost,
    };
  }

  /**
   * Get all upgrades available for current era
   */
  getAvailableUpgrades(): UpgradeInfo[] {
    const currentEra = this.stateManager.getCurrentEra();

    return this.config.upgrades
      .filter((u) => u.unlockedAtEra <= currentEra)
      .map((u) => this.getUpgradeInfo(u.id))
      .filter((info): info is UpgradeInfo => info !== null && info.visible);
  }

  /**
   * Get upgrades by category
   */
  getUpgradesByCategory(category: string): UpgradeInfo[] {
    return this.getAvailableUpgrades().filter(
      (info) => info.config.category === category
    );
  }

  /**
   * Check if an upgrade is unlocked (requirements met)
   */
  isUnlocked(upgradeId: string): boolean {
    const config = this.getUpgradeConfig(upgradeId);
    if (!config) return false;

    // Check era requirement
    const currentEra = this.stateManager.getCurrentEra();
    if (config.unlockedAtEra > currentEra) return false;

    // Check prerequisites (must have purchased these)
    if (config.prerequisites && config.prerequisites.length > 0) {
      for (const prereqId of config.prerequisites) {
        if (!this.stateManager.isUpgradePurchased(prereqId)) {
          return false;
        }
      }
    }

    // Check additional unlock requirements
    if (config.unlockRequirements && config.unlockRequirements.length > 0) {
      const requirements = config.unlockRequirements as UnlockRequirement[];
      if (!this.unlockEvaluator.evaluateAll(requirements)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if an upgrade should be visible in the UI
   */
  isVisible(upgradeId: string): boolean {
    const config = this.getUpgradeConfig(upgradeId);
    if (!config) return false;

    // Already purchased - show it
    if (this.stateManager.isUpgradePurchased(upgradeId)) return true;

    // Check era requirement
    const currentEra = this.stateManager.getCurrentEra();
    if (config.unlockedAtEra > currentEra) return false;

    // If visible before unlock, always show
    if (config.visibleBeforeUnlock) return true;

    // Otherwise only show if unlocked
    return this.isUnlocked(upgradeId);
  }

  /**
   * Calculate cost for an upgrade
   */
  calculateCost(upgradeId: string): UpgradeCost[] {
    const config = this.getUpgradeConfig(upgradeId);
    if (!config) return [];

    // Apply upgrade cost multiplier
    const costMultiplier = this.multiplierSystem.getValue("upgrade_cost");

    return config.cost.map((baseCost) => {
      // Upgrade costs are always simple numbers (not curves)
      const amount = typeof baseCost.amount === "number" ? baseCost.amount : 0;
      return {
        resourceId: baseCost.resourceId,
        amount: Math.ceil(amount * costMultiplier),
      };
    });
  }

  /**
   * Purchase an upgrade
   */
  purchase(upgradeId: string): boolean {
    const config = this.getUpgradeConfig(upgradeId);
    if (!config) return false;

    // Check if already purchased
    if (this.stateManager.isUpgradePurchased(upgradeId)) {
      return false;
    }

    // Check if unlocked
    if (!this.isUnlocked(upgradeId)) {
      return false;
    }

    const costs = this.calculateCost(upgradeId);

    // Deduct costs
    if (!this.stateManager.deductCosts(costs, `upgrade:${upgradeId}`)) {
      return false;
    }

    // Mark as purchased
    this.stateManager.purchaseUpgrade(upgradeId);

    // Apply effects
    this.applyUpgradeEffects(upgradeId);

    // Handle special effects
    this.handleSpecialEffects(upgradeId);

    EventBus.emit("upgrade:purchased", { upgradeId });

    return true;
  }

  /**
   * Apply multiplier effects from an upgrade
   */
  private applyUpgradeEffects(upgradeId: string): void {
    if (this.appliedUpgrades.has(upgradeId)) return;

    const config = this.getUpgradeConfig(upgradeId);
    if (!config || !config.effects) return;

    for (const effect of config.effects) {
      this.multiplierSystem.addMultiplier({
        id: `upgrade:${upgradeId}:${effect.stackId}`,
        stackId: effect.stackId,
        value: effect.value,
        sourceType: "upgrade",
        sourceId: upgradeId,
        sourceName: config.name,
      });
    }

    this.appliedUpgrades.add(upgradeId);
  }

  /**
   * Handle special effects from upgrades
   */
  private handleSpecialEffects(upgradeId: string): void {
    const config = this.getUpgradeConfig(upgradeId);
    if (!config?.specialEffects) return;

    for (const effect of config.specialEffects) {
      switch (effect.type) {
        case "unlock_building":
          if (effect.params.buildingId) {
            this.stateManager.unlockBuilding(effect.params.buildingId);
          }
          break;

        case "unlock_resource":
          if (effect.params.resourceId) {
            this.stateManager.unlockResource(effect.params.resourceId);
          }
          break;

        case "unlock_feature":
          if (effect.params.featureId) {
            this.stateManager.unlockFeature(effect.params.featureId);
          }
          break;

        case "one_time_grant":
          if (effect.params.grants) {
            for (const grant of effect.params.grants) {
              // Grant amounts are always simple numbers
              const grantAmount = typeof grant.amount === "number" ? grant.amount : 0;
              this.stateManager.updateResource(
                grant.resourceId,
                grantAmount,
                `upgrade:${upgradeId}`
              );
            }
          }
          break;

        // Other special effects can be added here
        default:
          // Unknown effect type - log but continue
          console.warn(
            `UpgradeSystem: Unknown special effect type "${effect.type}"`
          );
      }
    }
  }

  /**
   * Re-apply effects from already purchased upgrades
   * Called on game load to restore multipliers
   */
  private reapplyPurchasedUpgradeEffects(): void {
    for (const upgrade of this.config.upgrades) {
      if (this.stateManager.isUpgradePurchased(upgrade.id)) {
        this.applyUpgradeEffects(upgrade.id);
      }
    }
  }

  /**
   * Check and unlock upgrades based on requirements
   */
  checkUnlocks(): void {
    // This method is called periodically to check if upgrades have become available
    // The UI will automatically show them based on getAvailableUpgrades()
    // No explicit event needed since the UI polls for available upgrades
  }

  /**
   * Reset upgrades (for prestige)
   */
  resetForPrestige(): void {
    // Remove applied effects for upgrades that reset
    for (const upgrade of this.config.upgrades) {
      if (upgrade.resetsOnPrestige && this.appliedUpgrades.has(upgrade.id)) {
        // Remove multipliers from this upgrade
        for (const effect of upgrade.effects || []) {
          this.multiplierSystem.removeMultiplier(
            effect.stackId,
            `upgrade:${upgrade.id}:${effect.stackId}`
          );
        }
        this.appliedUpgrades.delete(upgrade.id);
      }
    }
  }

  private setupEventListeners(): void {
    // Check unlocks when resources change
    this.subscriptions.subscribe("resource:changed", () => {
      this.checkUnlocks();
    });

    // Check unlocks when buildings are purchased
    this.subscriptions.subscribe("building:purchased", () => {
      this.checkUnlocks();
    });

    // Re-apply effects after game load
    this.subscriptions.subscribe("game:load", () => {
      this.reapplyPurchasedUpgradeEffects();
    });
  }
}
