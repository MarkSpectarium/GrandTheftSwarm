/**
 * Resource Type Definitions
 *
 * Defines all resource types, their properties, and how they're acquired/spent.
 */

import type { Curve, CurveRef } from "./curves";

// =============================================================================
// RESOURCE CATEGORIES
// =============================================================================

/**
 * High-level categorization of resources
 */
export type ResourceCategory =
  | "primary"      // Main gameplay resources (rice, dong)
  | "secondary"    // Processed goods (flour, noodles)
  | "currency"     // Spendable currencies (dong, lotus tokens)
  | "prestige"     // Prestige currencies (ancestral wisdom)
  | "fuel"         // Consumables for actions (water, diesel)
  | "capacity"     // Limits (storage, fleet size)
  | "abstract";    // Non-item resources (reputation, influence)

// =============================================================================
// RESOURCE DEFINITION
// =============================================================================

/**
 * Complete definition of a game resource
 */
export interface ResourceConfig {
  /** Unique identifier (e.g., "rice", "dong", "ancestral_wisdom") */
  id: string;

  /** Display name */
  name: string;

  /** Plural display name */
  namePlural: string;

  /** Short description */
  description: string;

  /** Resource category */
  category: ResourceCategory;

  /** Icon identifier (for UI) */
  icon: string;

  /** Color theme (hex or CSS color name) */
  color: string;

  /** Which era this resource becomes available */
  unlockedAtEra: number;

  /** Initial amount when game starts (or after prestige) */
  initialAmount: number;

  /** Maximum storage capacity (undefined = unlimited) */
  maxCapacity?: number | CurveRef;

  /** Does this persist through prestige? */
  persistsOnPrestige: boolean;

  /** Is this visible before being unlocked? */
  visibleBeforeUnlock: boolean;

  /** Decimal places to show (0 for integers) */
  displayDecimals: number;

  /** Custom formatting rules */
  formatting?: ResourceFormatting;

  /** How this resource is acquired */
  acquisitionMethods: AcquisitionMethod[];

  /** How this resource is spent/lost */
  sinkMethods: SinkMethod[];
}

// =============================================================================
// RESOURCE FORMATTING
// =============================================================================

export interface ResourceFormatting {
  /** Use custom suffix table instead of default */
  customSuffixes?: SuffixEntry[];

  /** Threshold for scientific notation (undefined = use global default) */
  scientificThreshold?: number;

  /** Always show sign (+/-) */
  alwaysShowSign?: boolean;

  /** Prefix symbol (e.g., "$" for currency) */
  prefix?: string;

  /** Suffix symbol (e.g., "/sec" for rates) */
  suffix?: string;
}

export interface SuffixEntry {
  min: number;
  suffix: string;
  divisor: number;
}

// =============================================================================
// ACQUISITION & SINK METHODS (for documentation/UI)
// =============================================================================

/**
 * Ways a resource can be acquired
 */
export interface AcquisitionMethod {
  type: AcquisitionType;
  description: string;
  /** Reference to what provides this (e.g., building ID, upgrade ID) */
  sourceId?: string;
}

export type AcquisitionType =
  | "click"        // Manual clicking
  | "idle"         // Passive generation
  | "building"     // From buildings
  | "trade"        // From selling/trading
  | "event"        // From random events
  | "prestige"     // From prestige reset
  | "achievement"  // From achievements
  | "conversion"   // From converting other resources
  | "contract";    // From completing contracts

/**
 * Ways a resource is consumed
 */
export interface SinkMethod {
  type: SinkType;
  description: string;
  targetId?: string;
}

export type SinkType =
  | "purchase"     // Buying buildings/upgrades
  | "fuel"         // Consumed for actions
  | "conversion"   // Converted to other resources
  | "decay"        // Passive loss over time
  | "trade"        // Spent in trades
  | "upkeep"       // Ongoing maintenance costs
  | "consumption"; // Consumed by buildings to survive (e.g., buffalo drinking water)

// =============================================================================
// RESOURCE CONVERSION
// =============================================================================

/**
 * Defines conversion between resources (production chains)
 */
export interface ResourceConversionConfig {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Resources consumed */
  inputs: ResourceAmount[];

  /** Resources produced */
  outputs: ResourceAmount[];

  /** Time to complete one conversion (ms) */
  durationMs: number;

  /** Era when this becomes available */
  unlockedAtEra: number;

  /** Building that performs this conversion */
  buildingId?: string;

  /** Can this run automatically? */
  canAutomate: boolean;
}

export interface ResourceAmount {
  resourceId: string;
  amount: number | CurveRef;
}

// =============================================================================
// MARKET PRICES
// =============================================================================

/**
 * Configuration for resource market pricing
 */
export interface MarketPriceConfig {
  /** Resource being priced */
  resourceId: string;

  /** Base price in primary currency */
  basePrice: number;

  /** Price fluctuation settings */
  fluctuation?: PriceFluctuation;

  /** Supply/demand dynamics */
  supplyDemand?: SupplyDemandConfig;
}

export interface PriceFluctuation {
  /** Minimum price multiplier */
  minMultiplier: number;

  /** Maximum price multiplier */
  maxMultiplier: number;

  /** How often price changes (ms) */
  changeIntervalMs: number;

  /** Maximum change per interval */
  maxChangePercent: number;
}

export interface SupplyDemandConfig {
  /** Price drops as player sells more */
  sellPressure: Curve;

  /** Price recovers over time */
  recoveryRate: number;

  /** Price floor from selling */
  minPriceMultiplier: number;
}
