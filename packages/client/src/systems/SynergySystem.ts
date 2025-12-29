/**
 * SynergySystem - Processes synergy effects between buildings
 *
 * Handles synergy special effects where one building type provides
 * production bonuses to another building type based on owned count.
 *
 * Example: Buffalo provides +10% paddy_field production per buffalo owned
 */

import { EventBus, SubscriptionManager } from "../core/EventBus";
import { StateManager } from "../state/StateManager";
import { MultiplierSystem } from "../core/MultiplierSystem";
import type { GameConfig, BuildingConfig, SpecialEffect } from "../config/types";

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

export class SynergySystem {
  private config: GameConfig;
  private stateManager: StateManager;
  private multiplierSystem: MultiplierSystem;

  // Synergy definitions extracted from building configs
  private synergies: SynergyDefinition[] = [];

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

    // Setup event listeners
    this.setupEventListeners();

    // Apply synergies for current building counts (handles loaded games)
    this.applyAllSynergies();
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
   * Setup event listeners for building changes
   */
  private setupEventListeners(): void {
    // Update synergies when buildings are purchased
    this.subscriptions.subscribe("building:purchased", (data) => {
      this.updateSynergiesForBuilding(data.buildingId);
    });

    // Also handle building removal (e.g., buffalo death)
    this.subscriptions.subscribe("building:removed", (data) => {
      this.updateSynergiesForBuilding(data.buildingId);
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
   * Apply all synergies (used on initialization for loaded games)
   */
  private applyAllSynergies(): void {
    for (const synergy of this.synergies) {
      this.applySynergy(synergy);
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
}
