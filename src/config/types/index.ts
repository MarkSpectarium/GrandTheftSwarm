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
