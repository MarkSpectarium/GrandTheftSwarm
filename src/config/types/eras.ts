/**
 * Era System Type Definitions
 *
 * Defines eras, transitions, and era-specific configurations.
 */

import type { MultiplierEffect, MultiplierCondition } from "./multipliers";
import type { ResourceAmount } from "./resources";

// =============================================================================
// ERA DEFINITION
// =============================================================================

/**
 * Complete definition of a game era
 */
export interface EraConfig {
  /** Era number (1, 2, 3, 4) */
  id: number;

  /** Display name (e.g., "Roots", "Growth") */
  name: string;

  /** Subtitle/tagline */
  subtitle: string;

  /** Full description */
  description: string;

  /** Time period represented */
  timePeriod: string;

  /** Year range for display */
  yearRange: {
    start: number;
    end: number;
  };

  // ---------------------------------------------------------------------------
  // UNLOCK CONDITIONS
  // ---------------------------------------------------------------------------

  /** Requirements to unlock this era */
  unlockRequirements: EraUnlockRequirement[];

  /** Are all requirements needed (AND) or just one (OR)? */
  requireAll: boolean;

  // ---------------------------------------------------------------------------
  // ERA BONUSES
  // ---------------------------------------------------------------------------

  /** Multiplier effects active during this era */
  eraEffects: MultiplierEffect[];

  /** Features unlocked in this era */
  unlockedFeatures: string[];

  // ---------------------------------------------------------------------------
  // UI THEMING
  // ---------------------------------------------------------------------------

  /** UI theme configuration */
  theme: EraTheme;

  // ---------------------------------------------------------------------------
  // CONTENT REFERENCES
  // ---------------------------------------------------------------------------

  /** Building IDs available in this era */
  buildings: string[];

  /** Upgrade IDs available in this era */
  upgrades: string[];

  /** Resource IDs introduced in this era */
  newResources: string[];

  /** Event IDs that can occur in this era */
  events: string[];

  // ---------------------------------------------------------------------------
  // PRESTIGE
  // ---------------------------------------------------------------------------

  /** Prestige configuration for this era */
  prestige?: EraPrestigeConfig;
}

// =============================================================================
// UNLOCK REQUIREMENTS
// =============================================================================

export interface EraUnlockRequirement {
  type: EraUnlockType;
  params: EraUnlockParams;
  /** Description shown to player */
  description: string;
  /** Progress tracking info */
  progressTracking?: ProgressTracking;
}

export type EraUnlockType =
  | "resource_lifetime"    // Total resource ever earned
  | "resource_current"     // Currently held resource
  | "building_total"       // Total buildings owned
  | "building_specific"    // Specific building count
  | "upgrade_purchased"    // Specific upgrade bought
  | "upgrade_count"        // Total upgrades purchased
  | "prestige_level"       // Prestige level reached
  | "trade_count"          // Trades completed
  | "time_played"          // Total play time
  | "achievement";         // Specific achievement earned

export type EraUnlockParams = {
  resource?: string;
  amount?: number;
  building?: string;
  count?: number;
  upgrade?: string;
  level?: number;
  trades?: number;
  seconds?: number;
  achievement?: string;
};

export interface ProgressTracking {
  /** Variable to track */
  variable: string;
  /** Target value */
  target: number;
  /** Show percentage? */
  showPercentage: boolean;
  /** Show actual/target format? */
  showFraction: boolean;
}

// =============================================================================
// ERA THEMING
// =============================================================================

export interface EraTheme {
  /** Primary color (hex) */
  primaryColor: string;

  /** Secondary color (hex) */
  secondaryColor: string;

  /** Accent color (hex) */
  accentColor: string;

  /** Background color or gradient */
  background: string;

  /** Text color */
  textColor: string;

  /** Font family for headers */
  headerFont: string;

  /** Font family for body text */
  bodyFont: string;

  /** CSS class to apply to root */
  cssClass: string;

  /** UI style descriptors */
  styleKeywords: string[];

  /** Background texture/pattern */
  backgroundPattern?: string;

  /** Border style */
  borderStyle?: string;

  /** Button style overrides */
  buttonStyle?: ButtonStyle;

  /** Panel style overrides */
  panelStyle?: PanelStyle;
}

export interface ButtonStyle {
  background: string;
  hoverBackground: string;
  activeBackground: string;
  borderRadius: string;
  boxShadow?: string;
}

export interface PanelStyle {
  background: string;
  border: string;
  borderRadius: string;
  boxShadow?: string;
}

// =============================================================================
// PRESTIGE CONFIGURATION
// =============================================================================

export interface EraPrestigeConfig {
  /** Is prestige available in this era? */
  enabled: boolean;

  /** Prestige currency ID earned from this era */
  currencyId: string;

  /** Minimum to earn before prestige is worthwhile */
  minimumToPrestige: number;

  /** Formula for calculating prestige currency */
  formula: PrestigeFormula;

  /** What resets on prestige */
  resets: PrestigeReset;

  /** What persists through prestige */
  persists: PrestigePersist;

  /** Bonuses from prestige currency */
  bonuses: PrestigeBonus[];

  /** Prestige shop items */
  shopItems?: PrestigeShopItem[];
}

export interface PrestigeFormula {
  /** Type of calculation */
  type: "polynomial" | "logarithmic" | "custom";

  /** For polynomial: coefficient * (value / divisor) ^ power */
  coefficient?: number;
  divisor?: number;
  power?: number;

  /** For custom: expression string */
  expression?: string;

  /** Variable to use in calculation */
  inputVariable: string;
}

export interface PrestigeReset {
  /** Resource IDs that reset */
  resources: string[];

  /** Building IDs that reset */
  buildings: string[];

  /** Upgrade IDs that reset */
  upgrades: string[];

  /** Does era reset to 1? */
  eraResets: boolean;
}

export interface PrestigePersist {
  /** Resource IDs that persist */
  resources: string[];

  /** Upgrade IDs that persist */
  upgrades: string[];

  /** Achievement IDs always persist */
  achievements: boolean;

  /** Statistics persist */
  statistics: boolean;
}

export interface PrestigeBonus {
  /** What the bonus affects */
  effect: MultiplierEffect;

  /** Per unit of prestige currency */
  perUnit: number;

  /** Scaling curve (if diminishing) */
  scaling?: "linear" | "logarithmic" | "diminishing";

  /** Cap on this bonus */
  maxBonus?: number;
}

export interface PrestigeShopItem {
  /** Unique ID */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Cost in prestige currency */
  cost: number;

  /** Effect when purchased */
  effect: MultiplierEffect | PrestigeUnlock;

  /** One-time or repeatable? */
  repeatable: boolean;

  /** Max purchases if repeatable */
  maxPurchases?: number;

  /** Cost scaling if repeatable */
  costScaling?: number;
}

export interface PrestigeUnlock {
  type: "unlock";
  unlockType: "building" | "upgrade" | "feature" | "cosmetic";
  unlockId: string;
}

// =============================================================================
// ERA TRANSITIONS
// =============================================================================

export interface EraTransitionConfig {
  /** From era */
  fromEra: number;

  /** To era */
  toEra: number;

  /** Transition animation/sequence */
  transitionSequence: TransitionStep[];

  /** Story/narrative text shown during transition */
  narrativeText?: string[];

  /** Rewards granted on transition */
  transitionRewards?: ResourceAmount[];

  /** One-time tutorial shown */
  tutorialId?: string;
}

export interface TransitionStep {
  type: TransitionStepType;
  durationMs: number;
  params?: TransitionStepParams;
}

export type TransitionStepType =
  | "fade_out"
  | "show_text"
  | "play_animation"
  | "wait"
  | "apply_theme"
  | "fade_in"
  | "play_sound"
  | "show_rewards";

export type TransitionStepParams = {
  text?: string;
  animationId?: string;
  soundId?: string;
};
