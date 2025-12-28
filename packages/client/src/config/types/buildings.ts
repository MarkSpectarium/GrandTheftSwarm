/**
 * Building/Producer Type Definitions
 *
 * Buildings are purchasable entities that produce resources passively.
 *
 * Core production data is imported from 'shared' package to ensure
 * consistency between client and API (for offline calculations).
 */

import type { CurveRef } from "./curves";
import type { MultiplierEffect } from "./multipliers";
import type { ResourceAmount } from "./resources";
import type {
  ProductionOutput as SharedProductionOutput,
  ProductionConfig as SharedProductionConfig,
} from 'shared';

// =============================================================================
// BUILDING DEFINITION
// =============================================================================

/**
 * Complete definition of a purchasable building
 */
export interface BuildingConfig {
  /** Unique identifier (e.g., "paddy_field", "rice_mill") */
  id: string;

  /** Display name */
  name: string;

  /** Plural name */
  namePlural: string;

  /** Description text */
  description: string;

  /** Flavor text (thematic, shown in details) */
  flavorText?: string;

  /** Building category for UI grouping */
  category: BuildingCategory;

  /** Era when this building unlocks */
  unlockedAtEra: number;

  /** Additional unlock requirements */
  unlockRequirements?: UnlockRequirement[];

  /** Is this visible before being unlocked? */
  visibleBeforeUnlock: boolean;

  /** Icon identifier */
  icon: string;

  /** Visual tier (affects appearance) */
  visualTier: number;

  // ---------------------------------------------------------------------------
  // COSTS
  // ---------------------------------------------------------------------------

  /** Base cost to purchase first one */
  baseCost: ResourceAmount[];

  /** Cost scaling curve (typically exponential) */
  costCurve: CurveRef;

  /** Can purchase multiple at once? */
  allowBulkPurchase: boolean;

  /** Bulk purchase options (1, 10, 100, max) */
  bulkOptions?: number[];

  // ---------------------------------------------------------------------------
  // PRODUCTION
  // ---------------------------------------------------------------------------

  /** What this building produces per cycle */
  production: ProductionConfig;

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /** Multiplier effects this building provides */
  effects?: MultiplierEffect[];

  /** Special abilities or effects */
  specialEffects?: SpecialEffect[];

  // ---------------------------------------------------------------------------
  // LIMITS
  // ---------------------------------------------------------------------------

  /** Maximum number that can be owned (undefined = unlimited) */
  maxOwned?: number;

  /** Does this reset on prestige? */
  resetsOnPrestige: boolean;
}

// =============================================================================
// BUILDING CATEGORIES
// =============================================================================

export type BuildingCategory =
  | "production"    // Produces primary resources (paddies)
  | "processing"    // Converts resources (mills)
  | "storage"       // Increases capacity (warehouses)
  | "automation"    // Workers, drones
  | "transport"     // Boats, vehicles
  | "infrastructure"// Roads, docks
  | "special";      // Unique buildings

// =============================================================================
// PRODUCTION CONFIG
// =============================================================================

/**
 * Client-side production output extends shared with optional client fields
 */
export interface ProductionOutput extends SharedProductionOutput {
  /** How amount scales with building count (client-only) */
  scalingCurve?: CurveRef;

  /** Chance to produce (1.0 = always, 0.5 = 50% chance) (client-only) */
  chance?: number;
}

/**
 * Client-side production config extends shared with multiplier stack refs
 */
export interface ProductionConfig extends Omit<SharedProductionConfig, 'outputs' | 'inputs'> {
  /** Resources produced per production cycle */
  outputs: ProductionOutput[];

  /** Resources consumed per production cycle (optional) */
  inputs?: ResourceAmount[];

  /** Multiplier stack that affects production speed (client-only) */
  speedStackId?: string;

  /** Multiplier stack that affects production amount (client-only) */
  amountStackId?: string;
}

// =============================================================================
// UNLOCK REQUIREMENTS
// =============================================================================

export interface UnlockRequirement {
  type: UnlockRequirementType;
  params: UnlockRequirementParams;
  /** Description shown to player */
  description: string;
}

export type UnlockRequirementType =
  | "resource_lifetime"   // Accumulated X lifetime resource
  | "resource_current"    // Currently have X resource
  | "building_owned"      // Own X of another building
  | "upgrade_purchased"   // Have purchased an upgrade
  | "achievement_earned"  // Have earned an achievement
  | "prestige_level"      // Prestige level >= X
  | "era_reached";        // Have reached era X

export type UnlockRequirementParams = {
  resource?: string;
  amount?: number;
  building?: string;
  count?: number;
  upgrade?: string;
  achievement?: string;
  level?: number;
  era?: number;
};

// =============================================================================
// SPECIAL EFFECTS
// =============================================================================

export interface SpecialEffect {
  type: SpecialEffectType;
  params: SpecialEffectParams;
  description: string;
}

export type SpecialEffectType =
  | "synergy"           // Bonus when combined with other buildings
  | "milestone_bonus"   // Bonus at certain owned counts
  | "unlock_feature"    // Unlocks game feature
  | "enable_automation" // Enables auto-purchase/sell
  | "storage_increase"  // Increases resource capacity
  | "unlock_building"   // Unlocks another building
  | "unlock_upgrade";   // Unlocks an upgrade

export type SpecialEffectParams = {
  // For synergy
  synergyBuilding?: string;
  synergyBonus?: number;

  // For milestones
  milestones?: Array<{
    count: number;
    bonus: MultiplierEffect;
  }>;

  // For unlocks
  featureId?: string;
  buildingId?: string;
  upgradeId?: string;

  // For storage
  resourceId?: string;
  capacityIncrease?: number;
};

// =============================================================================
// BUILDING TIERS (for progression within an era)
// =============================================================================

/**
 * Defines tier progression for buildings
 */
export interface BuildingTierConfig {
  /** Building this tier system applies to */
  buildingId: string;

  /** Available tiers */
  tiers: BuildingTier[];
}

export interface BuildingTier {
  /** Tier number (1, 2, 3...) */
  tier: number;

  /** Display name modifier */
  namePrefix?: string;

  /** Requirements to unlock this tier */
  requirements: UnlockRequirement[];

  /** Cost to upgrade to this tier */
  upgradeCost: ResourceAmount[];

  /** Production multiplier at this tier */
  productionMultiplier: number;

  /** Visual changes */
  iconOverride?: string;
}
