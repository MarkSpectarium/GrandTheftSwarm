/**
 * Upgrade Type Definitions
 *
 * Upgrades are one-time purchases that provide permanent bonuses.
 */

import type { CurveRef } from "./curves";
import type { MultiplierEffect } from "./multipliers";
import type { ResourceAmount } from "./resources";
import type { UnlockRequirement } from "./buildings";

// =============================================================================
// UPGRADE DEFINITION
// =============================================================================

/**
 * Complete definition of a purchasable upgrade
 */
export interface UpgradeConfig {
  /** Unique identifier (e.g., "better_seeds", "iron_sickle") */
  id: string;

  /** Display name */
  name: string;

  /** Description of what this upgrade does */
  description: string;

  /** Flavor text */
  flavorText?: string;

  /** Upgrade category for UI grouping */
  category: UpgradeCategory;

  /** Era when this upgrade unlocks */
  unlockedAtEra: number;

  /** Additional unlock requirements */
  unlockRequirements?: UnlockRequirement[];

  /** Is this visible before being unlocked? */
  visibleBeforeUnlock: boolean;

  /** Icon identifier */
  icon: string;

  // ---------------------------------------------------------------------------
  // COSTS
  // ---------------------------------------------------------------------------

  /** Cost to purchase */
  cost: ResourceAmount[];

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /** Multiplier effects this upgrade provides */
  effects: MultiplierEffect[];

  /** Special effects (unlocks, features, etc.) */
  specialEffects?: UpgradeSpecialEffect[];

  // ---------------------------------------------------------------------------
  // TIERED UPGRADES
  // ---------------------------------------------------------------------------

  /** If this is a tiered upgrade, define tiers here */
  tiers?: UpgradeTier[];

  /** Does this reset on prestige? */
  resetsOnPrestige: boolean;

  // ---------------------------------------------------------------------------
  // UI HINTS
  // ---------------------------------------------------------------------------

  /** Upgrade tree position (for visual layout) */
  treePosition?: TreePosition;

  /** Prerequisites (must purchase these first) */
  prerequisites?: string[];

  /** What this leads to (for UI arrows) */
  leadsTo?: string[];
}

// =============================================================================
// UPGRADE CATEGORIES
// =============================================================================

export type UpgradeCategory =
  | "production"    // Increases resource production
  | "efficiency"    // Reduces costs or time
  | "automation"    // Enables or improves automation
  | "capacity"      // Increases storage or limits
  | "tools"         // Thematic: better equipment
  | "techniques"    // Thematic: improved methods
  | "research"      // Technology unlocks
  | "prestige"      // Purchased with prestige currency
  | "special";      // Unique upgrades

// =============================================================================
// TIERED UPGRADES
// =============================================================================

/**
 * For upgrades that can be purchased multiple times with increasing cost/effect
 */
export interface UpgradeTier {
  /** Tier number (1, 2, 3...) */
  tier: number;

  /** Display name for this tier */
  name: string;

  /** Cost for this tier */
  cost: ResourceAmount[];

  /** Effects at this tier (replaces previous tier effects) */
  effects: MultiplierEffect[];

  /** Additional unlock requirements for this tier */
  unlockRequirements?: UnlockRequirement[];
}

// =============================================================================
// SPECIAL EFFECTS
// =============================================================================

export interface UpgradeSpecialEffect {
  type: UpgradeEffectType;
  params: UpgradeEffectParams;
  description: string;
}

export type UpgradeEffectType =
  | "unlock_building"       // Makes a building available
  | "unlock_upgrade"        // Makes an upgrade available
  | "unlock_feature"        // Unlocks a game feature
  | "unlock_resource"       // Makes a resource visible/usable
  | "unlock_era"            // Enables era transition
  | "enable_automation"     // Enables auto features
  | "reveal_hidden"         // Reveals hidden content
  | "permanent_bonus"       // Bonus that persists through prestige
  | "one_time_grant"        // Grants resources on purchase
  | "modify_building"       // Changes building behavior
  | "modify_event";         // Changes event properties

export type UpgradeEffectParams = {
  // For unlocks
  buildingId?: string;
  upgradeId?: string;
  featureId?: string;
  resourceId?: string;
  eraId?: number;

  // For automation
  automationType?: string;

  // For one-time grants
  grants?: ResourceAmount[];

  // For building modifications
  targetBuilding?: string;
  modification?: string;

  // For event modifications
  eventId?: string;
  eventModification?: string;
};

// =============================================================================
// TREE POSITIONING
// =============================================================================

export interface TreePosition {
  /** Column in the tree (0-based) */
  column: number;

  /** Row in the tree (0-based) */
  row: number;

  /** Branch identifier (for multiple paths) */
  branch?: string;
}

// =============================================================================
// UPGRADE PATHS (for research trees)
// =============================================================================

/**
 * Defines an upgrade tree/path structure
 */
export interface UpgradePathConfig {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Era when this path becomes available */
  unlockedAtEra: number;

  /** Upgrades in this path */
  upgradeIds: string[];

  /** Visual theme/color */
  theme: string;
}

// =============================================================================
// REPEATABLE UPGRADES
// =============================================================================

/**
 * Upgrades that can be purchased infinitely with scaling costs/effects
 */
export interface RepeatableUpgradeConfig {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Category */
  category: UpgradeCategory;

  /** Era unlock */
  unlockedAtEra: number;

  /** Icon */
  icon: string;

  /** Base cost (scales with purchases) */
  baseCost: ResourceAmount[];

  /** Cost scaling curve */
  costCurve: CurveRef;

  /** Base effect (scales with purchases) */
  baseEffect: MultiplierEffect;

  /** Effect scaling curve */
  effectCurve: CurveRef;

  /** Maximum purchases (undefined = unlimited) */
  maxPurchases?: number;

  /** Resets on prestige? */
  resetsOnPrestige: boolean;
}
