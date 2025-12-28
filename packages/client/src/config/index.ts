/**
 * Game Configuration - Master Export
 *
 * This file assembles all configuration into a single GameConfig object.
 * The game engine imports this and uses it for all balance/content.
 *
 * To tune the game:
 * 1. Edit files in /balance for numbers (curves, timing, formatting)
 * 2. Edit files in /content for game content (resources, buildings, etc.)
 * 3. No engine code changes needed!
 */

import type { GameConfig } from "./types";

// Balance configs
import { curvePresets } from "./balance/curves.config";
import { timingConfig } from "./balance/timing.config";
import { formattingConfig } from "./balance/formatting.config";
import prestigeConfig from "./balance/prestige.config";

// Content configs
import resourcesConfig from "./content/resources.config";
import buildingsConfig from "./content/buildings.config";
import upgradesConfig from "./content/upgrades.config";

// =============================================================================
// MASTER CONFIGURATION
// =============================================================================

export const gameConfig: GameConfig = {
  // ---------------------------------------------------------------------------
  // META
  // ---------------------------------------------------------------------------
  meta: {
    name: "Grand Theft Swarm: Mekong Delta Farming Empire",
    version: "0.1.0",
    description: "Build a rice empire from manual harvesting to automated megacorp",
  },

  // ---------------------------------------------------------------------------
  // GAMEPLAY
  // Core gameplay configuration - what resource is harvested, what currency is used
  // ---------------------------------------------------------------------------
  gameplay: {
    /** Resource harvested when clicking */
    clickHarvestResource: "rice",
    /** Base amount per click (before multipliers) */
    clickBaseAmount: 1,
    /** Currency resource used in market transactions */
    marketCurrency: "dong",
  },

  // ---------------------------------------------------------------------------
  // BALANCE
  // ---------------------------------------------------------------------------
  timing: timingConfig,
  formatting: formattingConfig,
  curves: curvePresets,

  // ---------------------------------------------------------------------------
  // MULTIPLIER STACKS
  // Defines all the multiplier categories in the game
  // ---------------------------------------------------------------------------
  multiplierStacks: [
    // Production stacks
    {
      id: "click_power",
      name: "Click Power",
      category: "click_power",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "all_production",
      name: "All Production",
      category: "all_production",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "paddy_production",
      name: "Paddy Field Production",
      category: "specific_resource",
      targetResource: "paddy_field",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "worker_production",
      name: "Worker Production",
      category: "specific_resource",
      targetResource: "family_worker",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "buffalo_production",
      name: "Buffalo Production",
      category: "specific_resource",
      targetResource: "buffalo",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "mill_production",
      name: "Mill Production",
      category: "specific_resource",
      targetResource: "rice_mill",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "drone_production",
      name: "Drone Production",
      category: "specific_resource",
      targetResource: "harvest_drone",
      stackType: "multiplicative",
      baseValue: 1,
    },

    // Speed stacks
    {
      id: "paddy_speed",
      name: "Paddy Field Speed",
      category: "specific_resource",
      stackType: "additive",
      baseValue: 1,
      minValue: 0.1, // Can't go below 10% speed
    },
    {
      id: "worker_speed",
      name: "Worker Speed",
      category: "specific_resource",
      stackType: "additive",
      baseValue: 1,
      minValue: 0.1,
    },

    // Economy stacks
    {
      id: "sell_price",
      name: "Sell Price",
      category: "sell_price",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "trade_capacity",
      name: "Trade Capacity",
      category: "cargo_capacity",
      stackType: "additive",
      baseValue: 0, // No base capacity
    },
    {
      id: "trade_profit",
      name: "Trade Profit",
      category: "sell_price",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "travel_speed",
      name: "Travel Speed",
      category: "travel_speed",
      stackType: "additive",
      baseValue: 1,
    },

    // Cost stacks
    {
      id: "building_cost",
      name: "Building Cost",
      category: "building_cost",
      stackType: "multiplicative",
      baseValue: 1,
      minValue: 0.1, // Can't reduce below 10%
    },
    {
      id: "upgrade_cost",
      name: "Upgrade Cost",
      category: "upgrade_cost",
      stackType: "multiplicative",
      baseValue: 1,
      minValue: 0.1,
    },

    // Event stacks
    {
      id: "event_chance",
      name: "Event Chance",
      category: "event_chance",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "event_reward",
      name: "Event Reward",
      category: "event_reward",
      stackType: "multiplicative",
      baseValue: 1,
    },

    // Prestige stacks
    {
      id: "prestige_gain",
      name: "Prestige Gain",
      category: "prestige_gain",
      stackType: "multiplicative",
      baseValue: 1,
    },

    // Dingy stacks (Era 1 trading)
    {
      id: "dingy_speed",
      name: "Dingy Speed",
      category: "specific_resource",
      targetResource: "dingy",
      stackType: "multiplicative",
      baseValue: 1,
      minValue: 0.1,
    },
    {
      id: "dingy_profit",
      name: "Dingy Profit",
      category: "specific_resource",
      targetResource: "dingy",
      stackType: "multiplicative",
      baseValue: 1,
    },

    // Special stacks
    {
      id: "starting_rice",
      name: "Starting Rice",
      category: "specific_resource",
      stackType: "additive",
      baseValue: 0,
    },
    {
      id: "buffalo_speed",
      name: "Buffalo Speed",
      category: "specific_resource",
      stackType: "additive",
      baseValue: 1,
    },
  ],

  // ---------------------------------------------------------------------------
  // CONTENT
  // ---------------------------------------------------------------------------
  resources: resourcesConfig.resources,
  conversions: resourcesConfig.conversions,
  marketPrices: resourcesConfig.marketPrices,

  buildings: buildingsConfig.buildings,
  buildingTiers: buildingsConfig.buildingTiers,

  // Upgrades
  upgrades: upgradesConfig.upgrades,
  upgradePaths: upgradesConfig.upgradePaths,
  repeatableUpgrades: [],
  events: [],
  seasonalEvents: [],
  eventPools: [],

  eras: [
    {
      id: 1,
      name: "Roots",
      subtitle: "Where it all begins",
      description: "Post-war recovery, family farm, manual labor",
      timePeriod: "1980-1995",
      yearRange: { start: 1980, end: 1995 },
      unlockRequirements: [], // Era 1 is default
      requireAll: false,
      eraEffects: [],
      unlockedFeatures: ["manual_harvest", "basic_buildings"],
      theme: {
        primaryColor: "#8B4513",
        secondaryColor: "#D2691E",
        accentColor: "#FFD700",
        background: "#F5DEB3",
        textColor: "#2F1810",
        headerFont: "serif",
        bodyFont: "serif",
        cssClass: "era-1-roots",
        styleKeywords: ["weathered", "paper", "wood", "sepia"],
      },
      buildings: ["paddy_field", "family_worker", "buffalo", "dingy"],
      upgrades: ["better_seeds", "iron_sickle", "lightweight_hull", "market_contacts"],
      newResources: ["rice", "dong"],
      events: ["monsoon_blessing"],
    },
    {
      id: 2,
      name: "Growth",
      subtitle: "Mechanization begins",
      description: "Doi Moi reforms, mechanization, market expansion",
      timePeriod: "1995-2010",
      yearRange: { start: 1995, end: 2010 },
      unlockRequirements: [
        {
          type: "resource_lifetime",
          params: { resource: "rice", amount: 1000000 },
          description: "Harvest 1,000,000 lifetime rice",
        },
      ],
      requireAll: false,
      eraEffects: [
        { stackId: "all_production", value: 1.5 },
      ],
      unlockedFeatures: ["production_chains", "river_trade", "prestige"],
      theme: {
        primaryColor: "#2E8B57",
        secondaryColor: "#3CB371",
        accentColor: "#00FF7F",
        background: "#E0EEE0",
        textColor: "#1C3D1C",
        headerFont: "sans-serif",
        bodyFont: "sans-serif",
        cssClass: "era-2-growth",
        styleKeywords: ["digital", "early-web", "windows-95"],
      },
      buildings: ["rice_mill", "sampan", "noodle_workshop"],
      upgrades: [],
      newResources: ["rice_flour", "rice_noodles", "ancestral_wisdom"],
      events: [],
      prestige: prestigeConfig.era2,
    },
  ],

  eraTransitions: [
    {
      fromEra: 1,
      toEra: 2,
      transitionSequence: [
        { type: "fade_out", durationMs: 1000 },
        { type: "show_text", durationMs: 3000, params: { text: "The times are changing..." } },
        { type: "show_text", durationMs: 3000, params: { text: "A new generation rises." } },
        { type: "apply_theme", durationMs: 500 },
        { type: "fade_in", durationMs: 1000 },
        { type: "show_rewards", durationMs: 2000 },
      ],
      narrativeText: [
        "The old ways served you well, but the world moves forward.",
        "Your children have new ideas. Machines. Markets. Progress.",
        "The river carries more than rice now. It carries the future.",
      ],
      transitionRewards: [
        { resourceId: "dong", amount: 10000 },
      ],
    },
  ],
};

// =============================================================================
// EXPORTS
// =============================================================================

export default gameConfig;

// Re-export types for convenience
export * from "./types";

// Export individual configs for direct access
export { curvePresets } from "./balance/curves.config";
export { timingConfig } from "./balance/timing.config";
export { formattingConfig } from "./balance/formatting.config";
export { default as prestigeConfig } from "./balance/prestige.config";
export { default as resourcesConfig } from "./content/resources.config";
export { default as buildingsConfig } from "./content/buildings.config";
export { default as upgradesConfig } from "./content/upgrades.config";

// Export dev mode presets for accelerated testing
export {
  devModePresets,
  devModeDisabled,
  devModeFast,
  devModeTurbo,
  devModeHyper,
  devModeWithResources,
  devModeEra2Test,
  devModeDebug,
} from "./balance/devmode.config";
