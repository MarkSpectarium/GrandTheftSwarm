/**
 * Multiplier System Type Definitions
 *
 * Defines how bonuses stack and combine to affect game values.
 */

// =============================================================================
// MULTIPLIER CATEGORIES
// =============================================================================

/**
 * Categories of game values that can be multiplied
 */
export type MultiplierCategory =
  // Production multipliers
  | "click_power"           // Manual click harvest amount
  | "idle_production"       // Passive resource generation
  | "all_production"        // Both click and idle
  | "specific_resource"     // Targets a specific resource type

  // Cost multipliers
  | "building_cost"         // Building purchase costs
  | "upgrade_cost"          // Upgrade purchase costs
  | "all_costs"             // All purchase costs

  // Fleet & travel multipliers
  | "travel_speed"          // Reduces travel time
  | "cargo_capacity"        // Increases cargo hold
  | "fuel_efficiency"       // Reduces fuel consumption

  // Economy multipliers
  | "sell_price"            // Market sell returns
  | "buy_price"             // Market purchase costs (inverse beneficial)

  // Event multipliers
  | "event_chance"          // Random event probability
  | "event_duration"        // How long events last
  | "event_reward"          // Event reward amounts

  // Prestige multipliers
  | "prestige_gain"         // Prestige currency earned on reset
  | "prestige_bonus"        // Effectiveness of prestige bonuses

  // Meta multipliers
  | "experience_gain"       // If XP system exists
  | "unlock_progress";      // Progress toward unlocks

// =============================================================================
// STACK TYPES
// =============================================================================

/**
 * How multiple multipliers in a stack combine
 */
export type StackType =
  | "additive"       // Sum: 1 + (0.5 + 0.3 + 0.2) = 2.0x
  | "multiplicative" // Product: 1 * 1.5 * 1.3 * 1.2 = 2.34x
  | "diminishing";   // Diminishing: 1 - ((1-0.5) * (1-0.3) * (1-0.2)) = 0.72

/**
 * Definition of a multiplier stack
 */
export interface MultiplierStackConfig {
  /** Unique identifier for this stack */
  id: string;

  /** Human-readable name */
  name: string;

  /** What this stack affects */
  category: MultiplierCategory;

  /** How bonuses in this stack combine */
  stackType: StackType;

  /** Optional: specific resource this applies to (for "specific_resource" category) */
  targetResource?: string;

  /** Base value before any multipliers (usually 1.0) */
  baseValue: number;

  /** Minimum final value (floor) */
  minValue?: number;

  /** Maximum final value (cap) */
  maxValue?: number;
}

// =============================================================================
// MULTIPLIER SOURCES
// =============================================================================

/**
 * A single source contributing to a multiplier stack
 */
export interface MultiplierSourceConfig {
  /** Unique identifier */
  id: string;

  /** Which stack this contributes to */
  stackId: string;

  /** The bonus value (interpretation depends on stack type) */
  value: number;

  /** Where this bonus comes from (for UI display) */
  sourceType: MultiplierSourceType;

  /** Specific source ID (e.g., "upgrade:better_seeds") */
  sourceId: string;

  /** Display name for the source */
  sourceName: string;

  /** Is this a temporary bonus? */
  temporary?: boolean;

  /** For temporary bonuses: duration in milliseconds */
  durationMs?: number;

  /** Optional condition for this multiplier to be active */
  condition?: MultiplierCondition;
}

export type MultiplierSourceType =
  | "upgrade"       // From purchased upgrades
  | "building"      // From owned buildings
  | "prestige"      // From prestige bonuses
  | "event"         // From active events
  | "achievement"   // From unlocked achievements
  | "era"           // From current era
  | "equipment"     // From equipped items (if applicable)
  | "research"      // From research tree
  | "contract"      // From active contracts
  | "seasonal";     // From seasonal events

// =============================================================================
// CONDITIONS
// =============================================================================

/**
 * Condition that must be met for a multiplier to apply
 */
export interface MultiplierCondition {
  type: ConditionType;
  params: ConditionParams;
}

export type ConditionType =
  | "resource_gte"      // Resource >= value
  | "resource_lte"      // Resource <= value
  | "building_owned"    // Owns >= N of building
  | "upgrade_purchased" // Has purchased upgrade
  | "era_gte"           // Current era >= value
  | "era_eq"            // Current era == value
  | "time_of_day"       // Real-world time range
  | "event_active"      // Specific event is active
  | "prestige_level"    // Prestige level >= value
  | "and"               // All sub-conditions true
  | "or"                // Any sub-condition true
  | "not";              // Inverts sub-condition

export type ConditionParams = {
  // For resource conditions
  resource?: string;
  value?: number;

  // For building conditions
  building?: string;
  count?: number;

  // For upgrade conditions
  upgrade?: string;

  // For era conditions
  era?: number;

  // For time conditions
  startHour?: number;
  endHour?: number;

  // For event conditions
  event?: string;

  // For compound conditions
  conditions?: MultiplierCondition[];
  condition?: MultiplierCondition;
};

// =============================================================================
// MULTIPLIER EFFECTS (for upgrades, buildings, etc.)
// =============================================================================

/**
 * Defines a multiplier effect that something provides
 */
export interface MultiplierEffect {
  /** Stack to add this multiplier to */
  stackId: string;

  /** Value to add to the stack */
  value: number;

  /** Optional: scales with something (e.g., "owned" count) */
  scalesWithVar?: string;

  /** Optional: per-unit value when scaling */
  valuePerUnit?: number;
}
