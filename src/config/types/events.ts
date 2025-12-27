/**
 * Event System Type Definitions
 *
 * Random events, seasonal events, and triggered events.
 */

import type { CurveRef } from "./curves";
import type { MultiplierEffect, MultiplierCondition } from "./multipliers";
import type { ResourceAmount } from "./resources";

// =============================================================================
// EVENT DEFINITION
// =============================================================================

/**
 * Complete definition of a game event
 */
export interface EventConfig {
  /** Unique identifier (e.g., "monsoon_blessing", "market_boom") */
  id: string;

  /** Display name */
  name: string;

  /** Description shown when event triggers */
  description: string;

  /** Short description for notifications */
  shortDescription: string;

  /** Event category */
  category: EventCategory;

  /** Era when this event can occur */
  unlockedAtEra: number;

  /** Icon identifier */
  icon: string;

  /** Color theme */
  color: string;

  /** Sound effect to play */
  soundEffect?: string;

  // ---------------------------------------------------------------------------
  // TRIGGER CONDITIONS
  // ---------------------------------------------------------------------------

  /** How this event is triggered */
  triggerType: EventTriggerType;

  /** Trigger configuration */
  triggerConfig: EventTriggerConfig;

  // ---------------------------------------------------------------------------
  // DURATION & TIMING
  // ---------------------------------------------------------------------------

  /** How long the event lasts (ms), 0 = instant */
  durationMs: number;

  /** Cooldown before event can trigger again (ms) */
  cooldownMs: number;

  /** Can this event stack with itself? */
  canStack: boolean;

  /** Maximum stacks if stackable */
  maxStacks?: number;

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /** Multiplier effects while event is active */
  activeEffects?: MultiplierEffect[];

  /** One-time effects when event triggers */
  onTriggerEffects?: EventInstantEffect[];

  /** Effects when event ends */
  onEndEffects?: EventInstantEffect[];

  // ---------------------------------------------------------------------------
  // PLAYER INTERACTION
  // ---------------------------------------------------------------------------

  /** Does player need to click to activate? */
  requiresClick: boolean;

  /** Time window to click (ms), undefined = no expiry */
  clickWindowMs?: number;

  /** Bonus for clicking during event */
  clickBonus?: ClickBonusConfig;

  // ---------------------------------------------------------------------------
  // VISUALS
  // ---------------------------------------------------------------------------

  /** Animation to play */
  animation?: string;

  /** Screen effect (e.g., "rain", "golden_glow") */
  screenEffect?: string;

  /** Does this event show a popup? */
  showPopup: boolean;

  /** Does this event show in the event log? */
  showInLog: boolean;
}

// =============================================================================
// EVENT CATEGORIES
// =============================================================================

export type EventCategory =
  | "blessing"      // Positive random events (monsoon blessing)
  | "challenge"     // Negative or mixed events (drought)
  | "market"        // Economy-related events
  | "discovery"     // Finding new things
  | "seasonal"      // Calendar-based events
  | "milestone"     // Triggered by achievements
  | "story";        // Narrative events

// =============================================================================
// TRIGGER TYPES
// =============================================================================

export type EventTriggerType =
  | "random"        // Random chance per tick
  | "threshold"     // When value reaches amount
  | "time"          // At specific real-world time
  | "interval"      // Every X time
  | "action"        // When player does something
  | "combo"         // Multiple conditions
  | "manual";       // Triggered by code/other systems

export interface EventTriggerConfig {
  // For "random" type
  /** Chance per game tick (0-1) */
  chancePerTick?: number;
  /** Multiplier stack that affects chance */
  chanceStackId?: string;

  // For "threshold" type
  /** Variable to check */
  thresholdVar?: string;
  /** Value to reach */
  thresholdValue?: number;
  /** Comparison: gte, lte, eq */
  thresholdComparison?: "gte" | "lte" | "eq";

  // For "time" type
  /** Hour of day (0-23) */
  timeHour?: number;
  /** Day of week (0-6, 0 = Sunday) */
  timeDayOfWeek?: number;

  // For "interval" type
  /** Interval in milliseconds */
  intervalMs?: number;

  // For "action" type
  /** Action identifier */
  actionId?: string;

  // For "combo" type
  /** Multiple conditions that must be met */
  conditions?: MultiplierCondition[];

  // General
  /** Additional conditions for trigger */
  additionalConditions?: MultiplierCondition[];
}

// =============================================================================
// INSTANT EFFECTS
// =============================================================================

export interface EventInstantEffect {
  type: InstantEffectType;
  params: InstantEffectParams;
}

export type InstantEffectType =
  | "grant_resource"     // Give resources
  | "multiply_resource"  // Multiply current resource amount
  | "trigger_event"      // Trigger another event
  | "unlock_content"     // Unlock something permanently
  | "show_message"       // Display message to player
  | "play_animation"     // Play visual effect
  | "grant_achievement"; // Award an achievement

export type InstantEffectParams = {
  // For resource effects
  resourceId?: string;
  amount?: number | CurveRef;
  multiplier?: number;

  // For trigger
  eventId?: string;

  // For unlock
  unlockType?: string;
  unlockId?: string;

  // For message
  message?: string;
  messageType?: "info" | "success" | "warning";

  // For animation
  animationId?: string;

  // For achievement
  achievementId?: string;
};

// =============================================================================
// CLICK BONUS
// =============================================================================

export interface ClickBonusConfig {
  /** Multiplier to click power during event */
  clickMultiplier: number;

  /** Bonus resources per click */
  bonusPerClick?: ResourceAmount[];

  /** Stack ID that affects click bonus */
  bonusStackId?: string;
}

// =============================================================================
// SEASONAL EVENTS
// =============================================================================

/**
 * Events tied to real-world calendar
 */
export interface SeasonalEventConfig extends EventConfig {
  /** Start date (month-day format: "01-15" = Jan 15) */
  startDate: string;

  /** End date (month-day format) */
  endDate: string;

  /** Repeats every year? */
  yearly: boolean;

  /** Special content during this event */
  seasonalContent?: SeasonalContent;
}

export interface SeasonalContent {
  /** Special resources only available during event */
  temporaryResources?: string[];

  /** Special upgrades only available during event */
  temporaryUpgrades?: string[];

  /** Special buildings only available during event */
  temporaryBuildings?: string[];

  /** UI theme override */
  uiTheme?: string;

  /** Special currency for this event */
  eventCurrency?: string;

  /** Shop items purchasable with event currency */
  shopItems?: SeasonalShopItem[];
}

export interface SeasonalShopItem {
  id: string;
  name: string;
  description: string;
  cost: ResourceAmount[];
  reward: EventInstantEffect;
  maxPurchases?: number;
}

// =============================================================================
// EVENT POOLS
// =============================================================================

/**
 * Groups of events with weighted random selection
 */
export interface EventPoolConfig {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Events in this pool with weights */
  entries: EventPoolEntry[];

  /** Base trigger config for the pool */
  triggerConfig: EventTriggerConfig;
}

export interface EventPoolEntry {
  /** Event ID */
  eventId: string;

  /** Selection weight (higher = more likely) */
  weight: number;

  /** Additional conditions for this event */
  conditions?: MultiplierCondition[];
}
