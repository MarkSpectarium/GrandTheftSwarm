/**
 * Prestige System Configuration
 *
 * Defines prestige mechanics, currency calculations, and reset behavior.
 * These values heavily impact long-term game feel.
 */

import type { EraPrestigeConfig } from "../types";

// =============================================================================
// PRESTIGE CURRENCY FORMULAS
// =============================================================================

/**
 * Ancestral Wisdom (Era 2+ prestige currency)
 *
 * Formula: floor((lifetimeRice / 1,000,000,000,000) ^ (1/3))
 *
 * This means:
 * - 1 trillion rice = 1 wisdom
 * - 8 trillion rice = 2 wisdom
 * - 27 trillion rice = 3 wisdom
 * - 1 quadrillion rice = 10 wisdom
 *
 * Cubic root scaling ensures prestige always remains meaningful
 * but requires exponentially more resources for each point.
 */
export const ancestralWisdomFormula = {
  type: "polynomial" as const,
  coefficient: 1,
  divisor: 1e12, // 1 trillion
  power: 1 / 3, // Cube root
  inputVariable: "lifetimeRice",
};

// =============================================================================
// ERA PRESTIGE CONFIGURATIONS
// =============================================================================

/**
 * Era 2 Prestige Configuration
 * First prestige layer - introduces Ancestral Wisdom
 */
export const era2Prestige: EraPrestigeConfig = {
  enabled: true,
  currencyId: "ancestral_wisdom",

  /**
   * Minimum wisdom to make prestige worthwhile.
   * Below this, UI should warn player to wait.
   */
  minimumToPrestige: 1,

  formula: ancestralWisdomFormula,

  // ---------------------------------------------------------------------------
  // RESET BEHAVIOR
  // ---------------------------------------------------------------------------

  resets: {
    resources: [
      "rice",
      "dong",
      "rice_flour",
      "rice_noodles",
    ],

    buildings: [
      "paddy_field",
      "family_worker",
      "buffalo",
      "rice_mill",
      "village_market_stall",
      "sampan",
    ],

    upgrades: [
      // All Era 1 upgrades reset
      "better_seeds",
      "iron_sickle",
      "irrigation_channel",
      "family_teamwork",
      "monsoon_preparation",
    ],

    eraResets: true, // Back to Era 1
  },

  persists: {
    resources: [
      "ancestral_wisdom",
      "lotus_tokens", // Premium currency never resets
    ],

    upgrades: [
      // Prestige upgrades persist
      "ancestral_blessing",
      "generational_knowledge",
    ],

    achievements: true,
    statistics: true,
  },

  // ---------------------------------------------------------------------------
  // PRESTIGE BONUSES
  // ---------------------------------------------------------------------------

  bonuses: [
    {
      effect: {
        stackId: "all_production",
        value: 0.02, // 2% per wisdom point
      },
      perUnit: 1,
      scaling: "linear",
      maxBonus: undefined, // No cap
    },
    {
      effect: {
        stackId: "click_power",
        value: 0.05, // 5% per wisdom point
      },
      perUnit: 1,
      scaling: "linear",
      maxBonus: 10, // Cap at 1000% (200 points)
    },
  ],

  // ---------------------------------------------------------------------------
  // PRESTIGE SHOP
  // ---------------------------------------------------------------------------

  shopItems: [
    {
      id: "start_with_rice",
      name: "Seed Stock",
      description: "Start each run with 1,000 rice",
      cost: 5,
      effect: {
        stackId: "starting_rice",
        value: 1000,
      },
      repeatable: true,
      maxPurchases: 10,
      costScaling: 1.5, // Each purchase costs 50% more
    },
    {
      id: "faster_buffalo",
      name: "Buffalo Breeding",
      description: "Buffalo produce 25% faster",
      cost: 10,
      effect: {
        stackId: "buffalo_speed",
        value: 0.25,
      },
      repeatable: false,
    },
    {
      id: "unlock_auto_harvest",
      name: "Farming Instincts",
      description: "Unlock auto-click (1 click/sec)",
      cost: 25,
      effect: {
        type: "unlock",
        unlockType: "feature",
        unlockId: "auto_harvest",
      },
      repeatable: false,
    },
  ],
};

/**
 * Era 3 Prestige Configuration
 * Second prestige layer - more powerful bonuses
 */
export const era3Prestige: EraPrestigeConfig = {
  enabled: true,
  currencyId: "ancestral_wisdom",

  minimumToPrestige: 10, // Need at least 10 wisdom

  formula: {
    type: "polynomial",
    coefficient: 1,
    divisor: 1e15, // 1 quadrillion (harder in Era 3)
    power: 1 / 3,
    inputVariable: "lifetimeRice",
  },

  resets: {
    resources: [
      "rice",
      "dong",
      "rice_flour",
      "rice_noodles",
      "premium_rice",
      "packaged_noodles",
      "export_certificates",
    ],

    buildings: [
      // All Era 1 & 2 buildings
      "paddy_field",
      "family_worker",
      "buffalo",
      "rice_mill",
      "village_market_stall",
      "sampan",
      "motorboat",
      "processing_plant",
      "warehouse",
    ],

    upgrades: [
      // Most Era 1 & 2 upgrades
      // (list would be longer in full implementation)
    ],

    eraResets: true,
  },

  persists: {
    resources: [
      "ancestral_wisdom",
      "lotus_tokens",
    ],

    upgrades: [
      // Era 2+ prestige upgrades
      "ancestral_blessing",
      "generational_knowledge",
      "corporate_memory",
    ],

    achievements: true,
    statistics: true,
  },

  bonuses: [
    {
      effect: {
        stackId: "all_production",
        value: 0.05, // 5% per wisdom (higher in Era 3)
      },
      perUnit: 1,
      scaling: "diminishing", // Diminishing returns
      maxBonus: undefined,
    },
    {
      effect: {
        stackId: "trade_profit",
        value: 0.03, // 3% per wisdom
      },
      perUnit: 1,
      scaling: "linear",
    },
  ],

  shopItems: [
    // Era 3 has more powerful shop items
    {
      id: "skip_era_1",
      name: "Rapid Modernization",
      description: "Start in Era 2 with basic infrastructure",
      cost: 100,
      effect: {
        type: "unlock",
        unlockType: "feature",
        unlockId: "era_skip_1",
      },
      repeatable: false,
    },
  ],
};

// =============================================================================
// PRESTIGE MILESTONES
// =============================================================================

export interface PrestigeMilestone {
  wisdomRequired: number;
  name: string;
  description: string;
  reward: string;
}

/**
 * Milestones that provide one-time bonuses at wisdom thresholds
 */
export const prestigeMilestones: PrestigeMilestone[] = [
  {
    wisdomRequired: 1,
    name: "First Generation",
    description: "Complete your first prestige",
    reward: "Unlock Ancestral Blessing upgrade",
  },
  {
    wisdomRequired: 10,
    name: "Established Family",
    description: "Accumulate 10 Ancestral Wisdom",
    reward: "Unlock Family Crest cosmetic",
  },
  {
    wisdomRequired: 50,
    name: "Village Elder",
    description: "Accumulate 50 Ancestral Wisdom",
    reward: "Unlock Elder's Guidance (permanent +10% all production)",
  },
  {
    wisdomRequired: 100,
    name: "District Legend",
    description: "Accumulate 100 Ancestral Wisdom",
    reward: "Unlock Era 2 Quick Start",
  },
  {
    wisdomRequired: 500,
    name: "Provincial Dynasty",
    description: "Accumulate 500 Ancestral Wisdom",
    reward: "Unlock Golden Rice Fields cosmetic",
  },
  {
    wisdomRequired: 1000,
    name: "Mekong Legacy",
    description: "Accumulate 1000 Ancestral Wisdom",
    reward: "Unlock Legacy Mode (endless scaling)",
  },
];

export default {
  era2: era2Prestige,
  era3: era3Prestige,
  milestones: prestigeMilestones,
};
