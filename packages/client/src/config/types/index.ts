/**
 * Config Type Definitions - Master Export
 *
 * Import all config types from this file:
 *   import type { BuildingConfig, UpgradeConfig, ... } from "@/config/types";
 */

// Curve system
export type {
  Curve,
  CurveRef,
  CurveContext,
  CurvePreset,
  ExponentialCurve,
  ExponentialOffsetCurve,
  PolynomialCurve,
  LinearCurve,
  LogarithmicCurve,
  SigmoidCurve,
  StepCurve,
  StepThreshold,
  ConstantCurve,
  FormulaCurve,
  CompoundCurve,
  CompoundOperation,
} from "./curves";

// Multiplier system
export type {
  MultiplierCategory,
  StackType,
  MultiplierStackConfig,
  MultiplierSourceConfig,
  MultiplierSourceType,
  MultiplierCondition,
  ConditionType,
  ConditionParams,
  MultiplierEffect,
} from "./multipliers";

// Resources
export type {
  ResourceCategory,
  ResourceConfig,
  ResourceFormatting,
  SuffixEntry,
  AcquisitionMethod,
  AcquisitionType,
  SinkMethod,
  SinkType,
  ResourceConversionConfig,
  ResourceAmount,
  MarketPriceConfig,
  PriceFluctuation,
  SupplyDemandConfig,
} from "./resources";

// Buildings
export type {
  BuildingConfig,
  BuildingCategory,
  ProductionConfig,
  ProductionOutput,
  UnlockRequirement,
  UnlockRequirementType,
  UnlockRequirementParams,
  SpecialEffect,
  SpecialEffectType,
  SpecialEffectParams,
  BuildingTierConfig,
  BuildingTier,
  ConsumptionConfig,
  ConsumptionResource,
} from "./buildings";

// Upgrades
export type {
  UpgradeConfig,
  UpgradeCategory,
  UpgradeTier,
  UpgradeSpecialEffect,
  UpgradeEffectType,
  UpgradeEffectParams,
  TreePosition,
  UpgradePathConfig,
  RepeatableUpgradeConfig,
} from "./upgrades";

// Events
export type {
  EventConfig,
  EventCategory,
  EventTriggerType,
  EventTriggerConfig,
  EventInstantEffect,
  InstantEffectType,
  InstantEffectParams,
  ClickBonusConfig,
  SeasonalEventConfig,
  SeasonalContent,
  SeasonalShopItem,
  EventPoolConfig,
  EventPoolEntry,
} from "./events";

// Eras
export type {
  EraConfig,
  EraUnlockRequirement,
  EraUnlockType,
  EraUnlockParams,
  ProgressTracking,
  EraTheme,
  ButtonStyle,
  PanelStyle,
  EraPrestigeConfig,
  PrestigeFormula,
  PrestigeReset,
  PrestigePersist,
  PrestigeBonus,
  PrestigeShopItem,
  PrestigeUnlock,
  EraTransitionConfig,
  TransitionStep,
  TransitionStepType,
  TransitionStepParams,
} from "./eras";

// =============================================================================
// MASTER CONFIG TYPE
// =============================================================================

import type { CurvePreset } from "./curves";
import type { MultiplierStackConfig } from "./multipliers";
import type { ResourceConfig, ResourceConversionConfig, MarketPriceConfig } from "./resources";
import type { BuildingConfig, BuildingTierConfig } from "./buildings";
import type { UpgradeConfig, UpgradePathConfig, RepeatableUpgradeConfig } from "./upgrades";
import type { EventConfig, SeasonalEventConfig, EventPoolConfig } from "./events";
import type { EraConfig, EraTransitionConfig } from "./eras";

/**
 * Complete game configuration
 */
export interface GameConfig {
  meta: GameMetaConfig;
  gameplay: GameplayConfig;
  timing: TimingConfig;
  formatting: FormattingConfig;
  curves: CurvePreset[];
  multiplierStacks: MultiplierStackConfig[];
  resources: ResourceConfig[];
  conversions: ResourceConversionConfig[];
  marketPrices: MarketPriceConfig[];
  buildings: BuildingConfig[];
  buildingTiers: BuildingTierConfig[];
  upgrades: UpgradeConfig[];
  upgradePaths: UpgradePathConfig[];
  repeatableUpgrades: RepeatableUpgradeConfig[];
  events: EventConfig[];
  seasonalEvents: SeasonalEventConfig[];
  eventPools: EventPoolConfig[];
  eras: EraConfig[];
  eraTransitions: EraTransitionConfig[];

  /**
   * Development/test mode configuration (optional)
   * When enabled, allows accelerated testing of long-term systems
   */
  devMode?: DevModeConfig;
}

/**
 * Core gameplay configuration
 */
export interface GameplayConfig {
  /** Resource ID harvested when clicking */
  clickHarvestResource: string;

  /** Base amount per click (before multipliers) */
  clickBaseAmount: number;

  /** Currency resource ID used in market transactions */
  marketCurrency: string;
}

/**
 * Game metadata
 */
export interface GameMetaConfig {
  name: string;
  version: string;
  description: string;
}

/**
 * Timing configuration
 */
export interface TimingConfig {
  /** Base game tick interval (ms) */
  baseTickMs: number;

  /** Tick interval when tab is hidden (ms) */
  idleTickMs: number;

  /** Maximum offline time to calculate (seconds) */
  maxOfflineSeconds: number;

  /** Efficiency multiplier for offline gains (0-1) */
  offlineEfficiency: number;

  /** Auto-save interval (ms) */
  autoSaveIntervalMs: number;
}

/**
 * Development/test mode configuration
 * Used for accelerated testing of long-term game systems
 */
export interface DevModeConfig {
  /** Enable dev mode features */
  enabled: boolean;

  /**
   * Global time multiplier for accelerated testing.
   * 1 = normal speed, 10 = 10x speed, 100 = 100x speed
   * Applies to all game ticks, production, and time-based mechanics.
   */
  timeMultiplier: number;

  /**
   * Start with resources for testing (bypasses early game)
   */
  startingResources?: Record<string, number>;

  /**
   * Start with buildings for testing
   */
  startingBuildings?: Record<string, number>;

  /**
   * Unlock all buildings regardless of requirements
   */
  unlockAllBuildings?: boolean;

  /**
   * Disable auto-save (useful for repeated test runs)
   */
  disableAutoSave?: boolean;

  /**
   * Log tick timing information
   */
  logTicks?: boolean;
}

/**
 * Number formatting configuration
 */
export interface FormattingConfig {
  /** Thousands separator */
  thousandsSeparator: string;

  /** Decimal separator */
  decimalSeparator: string;

  /** Suffix thresholds for number abbreviation */
  suffixes: Array<{
    min: number;
    suffix: string;
    divisor: number;
  }>;

  /** When to switch to scientific notation */
  scientificThreshold: number;

  /** Decimal places in scientific notation */
  scientificPrecision: number;
}
