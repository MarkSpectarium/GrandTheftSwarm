/**
 * SynergySystem - Processes synergy effects and building effects
 *
 * Handles:
 * 1. Synergy special effects where one building type provides
 *    production bonuses to another building type based on owned count.
 *    Example: Buffalo provides +10% paddy_field production per buffalo owned
 *
 * 2. Building effects (multiplier effects) that scale with owned count.
 *    Example: Family Worker provides +10% click power per worker owned
 */

import { EventBus, SubscriptionManager } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import { MultiplierSystem } from "../core/MultiplierSystem";
import type { GameConfig, BuildingConfig, MultiplierEffect } from "../config/types";

interface SynergyDefinition {
  /** Building that provides the synergy bonus */
  sourceBuildingId: string;
  /** Building that receives the bonus */
  targetBuildingId: string;
  /** Bonus per source building owned (e.g., 0.1 = 10% per unit) */
  bonusPerUnit: number;
  /** The multiplier stack to add the bonus to */
  targetStackId: string;
  /** Display name for the source building */
  sourceBuildingName: string;
}

interface BuildingEffectDefinition {
  /** Building that provides the effect */
  buildingId: string;
  /** Display name for the building */
  buildingName: string;
  /** The multiplier stack to add to */
  stackId: string;
  /** Value per building owned */
  valuePerUnit: number;
  /** Whether this scales with owned count */
  scalesWithOwned: boolean;
  /** Fixed value (used when not scaling) */
  fixedValue: number;
}

export class SynergySystem {
  private config: GameConfig;
  private stateManager: StateManager;
  private multiplierSystem: MultiplierSystem;

  // Synergy definitions extracted from building configs
  private synergies: SynergyDefinition[] = [];

  // Building effect definitions extracted from building configs
  private buildingEffects: BuildingEffectDefinition[] = [];

  // Cleanup tracking
  private subscriptions = new SubscriptionManager();

  constructor(
    config: GameConfig,
    stateManager: StateManager,
    multiplierSystem: MultiplierSystem
  ) {
    this.config = config;
    this.stateManager = stateManager;
    this.multiplierSystem = multiplierSystem;

    // Extract synergy definitions from building configs
    this.extractSynergyDefinitions();

    // Extract building effect definitions
    this.extractBuildingEffectDefinitions();

    // Setup event listeners
    this.setupEventListeners();

    // Apply synergies and effects for current building counts (handles loaded games)
    this.applyAllSynergies();
    this.applyAllBuildingEffects();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.subscriptions.dispose();
  }

  /**
   * Extract synergy definitions from all building configs
   */
  private extractSynergyDefinitions(): void {
    for (const building of this.config.buildings) {
      if (!building.specialEffects) continue;

      for (const effect of building.specialEffects) {
        if (effect.type !== "synergy") continue;
        if (!effect.params.synergyBuilding || effect.params.synergyBonus === undefined) continue;

        // Find the target building to get its production stack
        const targetBuilding = this.config.buildings.find(
          (b) => b.id === effect.params.synergyBuilding
        );

        if (!targetBuilding) {
          console.warn(
            `SynergySystem: Target building "${effect.params.synergyBuilding}" not found for synergy from "${building.id}"`
          );
          continue;
        }

        // Get the target's production amount stack
        const targetStackId = targetBuilding.production?.amountStackId;
        if (!targetStackId) {
          console.warn(
            `SynergySystem: Target building "${effect.params.synergyBuilding}" has no amountStackId`
          );
          continue;
        }

        this.synergies.push({
          sourceBuildingId: building.id,
          targetBuildingId: effect.params.synergyBuilding,
          bonusPerUnit: effect.params.synergyBonus,
          targetStackId,
          sourceBuildingName: building.name,
        });
      }
    }

    if (this.synergies.length > 0) {
      console.log(`SynergySystem: Found ${this.synergies.length} synergy definition(s)`);
    }
  }

  /**
   * Extract building effect definitions from all building configs
   */
  private extractBuildingEffectDefinitions(): void {
    for (const building of this.config.buildings) {
      if (!building.effects || building.effects.length === 0) continue;

      for (const effect of building.effects) {
        this.buildingEffects.push({
          buildingId: building.id,
          buildingName: building.name,
          stackId: effect.stackId,
          valuePerUnit: effect.valuePerUnit ?? effect.value,
          scalesWithOwned: effect.scalesWithVar === "owned",
          fixedValue: effect.value,
        });
      }
    }

    if (this.buildingEffects.length > 0) {
      console.log(`SynergySystem: Found ${this.buildingEffects.length} building effect(s)`);
    }
  }

  /**
   * Setup event listeners for building changes
   */
  private setupEventListeners(): void {
    // Update synergies and effects when buildings are purchased
    this.subscriptions.subscribe("building:purchased", (data) => {
      this.updateSynergiesForBuilding(data.buildingId);
      this.updateBuildingEffectsForBuilding(data.buildingId);
    });

    // Also handle building removal (e.g., buffalo death)
    this.subscriptions.subscribe("building:removed", (data) => {
      this.updateSynergiesForBuilding(data.buildingId);
      this.updateBuildingEffectsForBuilding(data.buildingId);
    });
  }

  /**
   * Update synergy multipliers when a building's count changes
   */
  private updateSynergiesForBuilding(buildingId: string): void {
    // Find synergies where this building is the source
    const relevantSynergies = this.synergies.filter(
      (s) => s.sourceBuildingId === buildingId
    );

    for (const synergy of relevantSynergies) {
      this.applySynergy(synergy);
    }
  }

  /**
   * Update building effect multipliers when a building's count changes
   */
  private updateBuildingEffectsForBuilding(buildingId: string): void {
    // Find effects where this building is the source
    const relevantEffects = this.buildingEffects.filter(
      (e) => e.buildingId === buildingId
    );

    for (const effect of relevantEffects) {
      this.applyBuildingEffect(effect);
    }
  }

  /**
   * Apply all synergies (used on initialization for loaded games)
   */
  private applyAllSynergies(): void {
    for (const synergy of this.synergies) {
      this.applySynergy(synergy);
    }
  }

  /**
   * Apply all building effects (used on initialization for loaded games)
   */
  private applyAllBuildingEffects(): void {
    for (const effect of this.buildingEffects) {
      this.applyBuildingEffect(effect);
    }
  }

  /**
   * Apply a single synergy effect
   */
  private applySynergy(synergy: SynergyDefinition): void {
    const sourceState = this.stateManager.getBuilding(synergy.sourceBuildingId);
    const sourceCount = sourceState?.owned ?? 0;

    // Calculate the multiplier value
    // For multiplicative stacks: value = 1 + (count * bonusPerUnit)
    // e.g., 5 buffalo * 0.1 bonus = 1.5x multiplier
    const multiplierValue = 1 + (sourceCount * synergy.bonusPerUnit);

    // Create a unique ID for this synergy multiplier
    const multiplierId = `synergy:${synergy.sourceBuildingId}:${synergy.targetBuildingId}`;

    if (sourceCount === 0) {
      // Remove the multiplier if no source buildings
      this.multiplierSystem.removeMultiplier(synergy.targetStackId, multiplierId);
    } else {
      // Add or update the multiplier
      this.multiplierSystem.addMultiplier({
        id: multiplierId,
        stackId: synergy.targetStackId,
        value: multiplierValue,
        sourceType: "building",
        sourceId: synergy.sourceBuildingId,
        sourceName: `${synergy.sourceBuildingName} Synergy`,
      });
    }
  }

  /**
   * Apply a single building effect
   */
  private applyBuildingEffect(effect: BuildingEffectDefinition): void {
    const buildingState = this.stateManager.getBuilding(effect.buildingId);
    const ownedCount = buildingState?.owned ?? 0;

    // Create a unique ID for this building effect multiplier
    const multiplierId = `building:${effect.buildingId}:${effect.stackId}`;

    if (ownedCount === 0) {
      // Remove the multiplier if no buildings owned
      this.multiplierSystem.removeMultiplier(effect.stackId, multiplierId);
      return;
    }

    // Calculate the multiplier value
    let multiplierValue: number;
    if (effect.scalesWithOwned) {
      // Scales with owned count: value = 1 + (count * valuePerUnit)
      // e.g., 5 workers * 0.1 = 1.5x click power
      multiplierValue = 1 + (ownedCount * effect.valuePerUnit);
    } else {
      // Fixed value (doesn't scale): value = 1 + fixedValue
      multiplierValue = 1 + effect.fixedValue;
    }

    // Add or update the multiplier
    this.multiplierSystem.addMultiplier({
      id: multiplierId,
      stackId: effect.stackId,
      value: multiplierValue,
      sourceType: "building",
      sourceId: effect.buildingId,
      sourceName: `${effect.buildingName}`,
    });
  }

  /**
   * Get all active synergy bonuses (for UI display)
   */
  getSynergyBonuses(): Array<{
    sourceBuildingId: string;
    targetBuildingId: string;
    sourceCount: number;
    totalBonus: number;
    description: string;
  }> {
    const bonuses = [];

    for (const synergy of this.synergies) {
      const sourceState = this.stateManager.getBuilding(synergy.sourceBuildingId);
      const sourceCount = sourceState?.owned ?? 0;

      if (sourceCount > 0) {
        const totalBonus = sourceCount * synergy.bonusPerUnit;
        bonuses.push({
          sourceBuildingId: synergy.sourceBuildingId,
          targetBuildingId: synergy.targetBuildingId,
          sourceCount,
          totalBonus,
          description: `${synergy.sourceBuildingName} provides +${Math.round(totalBonus * 100)}% production`,
        });
      }
    }

    return bonuses;
  }

  /**
   * Get all active building effect bonuses (for UI display)
   */
  getBuildingEffectBonuses(): Array<{
    buildingId: string;
    stackId: string;
    ownedCount: number;
    totalBonus: number;
    description: string;
  }> {
    const bonuses = [];

    for (const effect of this.buildingEffects) {
      const buildingState = this.stateManager.getBuilding(effect.buildingId);
      const ownedCount = buildingState?.owned ?? 0;

      if (ownedCount > 0) {
        const totalBonus = effect.scalesWithOwned
          ? ownedCount * effect.valuePerUnit
          : effect.fixedValue;

        bonuses.push({
          buildingId: effect.buildingId,
          stackId: effect.stackId,
          ownedCount,
          totalBonus,
          description: `${effect.buildingName} provides +${Math.round(totalBonus * 100)}% ${effect.stackId.replace(/_/g, " ")}`,
        });
      }
    }

    return bonuses;
  }
}
