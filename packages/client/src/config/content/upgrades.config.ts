/**
 * Upgrades Configuration
 *
 * Defines all purchasable one-time upgrades, their costs, and effects.
 * Upgrades provide permanent bonuses until prestige.
 */

import type { UpgradeConfig, UpgradePathConfig } from "../types";

// =============================================================================
// ERA 1 UPGRADES - "ROOTS"
// =============================================================================

export const upgrades: UpgradeConfig[] = [
  // ---------------------------------------------------------------------------
  // CLICK UPGRADES - Improve manual harvesting
  // ---------------------------------------------------------------------------

  {
    id: "calloused_hands",
    name: "Calloused Hands",
    description: "Years of work have toughened your grip. +50% click power.",
    flavorText: "These hands tell a story of honest labor.",
    category: "tools",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 100 },
        description: "Harvest 100 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "hands",
    cost: [{ resourceId: "rice", amount: 100 }],
    effects: [
      {
        stackId: "click_power",
        value: 1.5, // 50% increase (multiplicative)
      },
    ],
    resetsOnPrestige: true,
  },

  {
    id: "bamboo_sickle",
    name: "Bamboo Sickle",
    description: "A lightweight tool for faster harvesting. +100% click power.",
    flavorText: "Bamboo bends but never breaks.",
    category: "tools",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 500 },
        description: "Harvest 500 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "sickle",
    cost: [{ resourceId: "rice", amount: 500 }],
    effects: [
      {
        stackId: "click_power",
        value: 2.0, // Double click power
      },
    ],
    prerequisites: ["calloused_hands"],
    resetsOnPrestige: true,
  },

  {
    id: "iron_sickle",
    name: "Iron Sickle",
    description: "Sharp iron cuts through stalks like water. +200% click power.",
    flavorText: "The blacksmith's finest work.",
    category: "tools",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 2000 },
        description: "Harvest 2,000 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "iron_sickle",
    cost: [{ resourceId: "rice", amount: 2000 }],
    effects: [
      {
        stackId: "click_power",
        value: 3.0, // Triple click power
      },
    ],
    prerequisites: ["bamboo_sickle"],
    resetsOnPrestige: true,
  },

  {
    id: "masters_technique",
    name: "Master's Technique",
    description: "Ancient harvesting wisdom passed down through generations. +500% click power.",
    flavorText: "The old ways are the best ways.",
    category: "techniques",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 10000 },
        description: "Harvest 10,000 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "scroll",
    cost: [{ resourceId: "rice", amount: 10000 }],
    effects: [
      {
        stackId: "click_power",
        value: 5.0, // 5x click power
      },
    ],
    prerequisites: ["iron_sickle"],
    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // PRODUCTION UPGRADES - Improve passive production
  // ---------------------------------------------------------------------------

  {
    id: "better_seeds",
    name: "Better Seeds",
    description: "Higher-yield rice varieties. +25% paddy field production.",
    flavorText: "The best rice comes from the best seeds.",
    category: "production",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "paddy_field", count: 1 },
        description: "Own a Paddy Field",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "seeds",
    cost: [{ resourceId: "rice", amount: 200 }],
    effects: [
      {
        stackId: "paddy_production",
        value: 1.25,
      },
    ],
    resetsOnPrestige: true,
  },

  {
    id: "improved_irrigation",
    name: "Improved Irrigation",
    description: "Better water flow to all fields. +50% paddy field production.",
    flavorText: "Water is life. Control water, control growth.",
    category: "production",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "paddy_field", count: 3 },
        description: "Own 3 Paddy Fields",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "irrigation",
    cost: [{ resourceId: "rice", amount: 1000 }],
    effects: [
      {
        stackId: "paddy_production",
        value: 1.5,
      },
    ],
    prerequisites: ["better_seeds"],
    resetsOnPrestige: true,
  },

  {
    id: "fertile_soil",
    name: "Fertile Soil Treatment",
    description: "Nutrient-rich soil amendments. +100% paddy field production.",
    flavorText: "The earth gives back what you put in.",
    category: "production",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "paddy_field", count: 5 },
        description: "Own 5 Paddy Fields",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "soil",
    cost: [{ resourceId: "rice", amount: 5000 }],
    effects: [
      {
        stackId: "paddy_production",
        value: 2.0,
      },
    ],
    prerequisites: ["improved_irrigation"],
    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // WORKER UPGRADES - Improve family member efficiency
  // ---------------------------------------------------------------------------

  {
    id: "family_training",
    name: "Family Training",
    description: "Teach efficient harvesting techniques. +50% worker production.",
    flavorText: "A family that works together, thrives together.",
    category: "efficiency",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "family_worker", count: 1 },
        description: "Have a Family Member",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "training",
    cost: [{ resourceId: "rice", amount: 500 }],
    effects: [
      {
        stackId: "worker_production",
        value: 1.5,
      },
    ],
    resetsOnPrestige: true,
  },

  {
    id: "work_songs",
    name: "Work Songs",
    description: "Rhythmic songs boost morale and pace. +100% worker production.",
    flavorText: "Singing makes the work lighter.",
    category: "efficiency",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "family_worker", count: 3 },
        description: "Have 3 Family Members",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "music",
    cost: [{ resourceId: "rice", amount: 2000 }],
    effects: [
      {
        stackId: "worker_production",
        value: 2.0,
      },
    ],
    prerequisites: ["family_training"],
    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // BUFFALO UPGRADES - Improve water buffalo efficiency
  // ---------------------------------------------------------------------------

  {
    id: "buffalo_training",
    name: "Buffalo Training",
    description: "Train buffalo to work longer hours. +50% buffalo production.",
    flavorText: "A well-trained buffalo is worth ten workers.",
    category: "efficiency",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "buffalo", count: 1 },
        description: "Own a Water Buffalo",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "buffalo_training",
    cost: [{ resourceId: "rice", amount: 3000 }],
    effects: [
      {
        stackId: "buffalo_production",
        value: 1.5,
      },
    ],
    resetsOnPrestige: true,
  },

  {
    id: "premium_feed",
    name: "Premium Feed",
    description: "Better nutrition for stronger buffalo. +100% buffalo production.",
    flavorText: "Strong buffalo, strong harvest.",
    category: "efficiency",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "buffalo", count: 2 },
        description: "Own 2 Water Buffalo",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "feed",
    cost: [{ resourceId: "rice", amount: 8000 }],
    effects: [
      {
        stackId: "buffalo_production",
        value: 2.0,
      },
    ],
    prerequisites: ["buffalo_training"],
    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // GLOBAL UPGRADES - Affect all production
  // ---------------------------------------------------------------------------

  {
    id: "early_mornings",
    name: "Early Mornings",
    description: "Start work at dawn. +10% all production.",
    flavorText: "The early bird catches the worm.",
    category: "techniques",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 1000 },
        description: "Harvest 1,000 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "sunrise",
    cost: [{ resourceId: "rice", amount: 1500 }],
    effects: [
      {
        stackId: "all_production",
        value: 1.1,
      },
    ],
    resetsOnPrestige: true,
  },

  {
    id: "efficient_planning",
    name: "Efficient Planning",
    description: "Organize work for maximum output. +25% all production.",
    flavorText: "A good plan is half the work done.",
    category: "techniques",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 5000 },
        description: "Harvest 5,000 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "planning",
    cost: [{ resourceId: "rice", amount: 7500 }],
    effects: [
      {
        stackId: "all_production",
        value: 1.25,
      },
    ],
    prerequisites: ["early_mornings"],
    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // COST REDUCTION UPGRADES
  // ---------------------------------------------------------------------------

  {
    id: "bulk_materials",
    name: "Bulk Materials",
    description: "Buy supplies in bulk for discounts. -10% building costs.",
    flavorText: "Save a little on each, save a lot overall.",
    category: "efficiency",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 3000 },
        description: "Harvest 3,000 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "discount",
    cost: [{ resourceId: "rice", amount: 4000 }],
    effects: [
      {
        stackId: "building_cost",
        value: 0.9, // 10% reduction
      },
    ],
    resetsOnPrestige: true,
  },

  {
    id: "local_connections",
    name: "Local Connections",
    description: "Know the right people for better deals. -20% building costs.",
    flavorText: "It's not what you know, it's who you know.",
    category: "efficiency",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 15000 },
        description: "Harvest 15,000 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "handshake",
    cost: [{ resourceId: "rice", amount: 20000 }],
    effects: [
      {
        stackId: "building_cost",
        value: 0.8, // 20% reduction
      },
    ],
    prerequisites: ["bulk_materials"],
    resetsOnPrestige: true,
  },
];

// =============================================================================
// UPGRADE PATHS (for visual tree layout)
// =============================================================================

export const upgradePaths: UpgradePathConfig[] = [
  {
    id: "click_path",
    name: "Harvesting Mastery",
    description: "Improve your manual harvesting abilities",
    unlockedAtEra: 1,
    upgradeIds: [
      "calloused_hands",
      "bamboo_sickle",
      "iron_sickle",
      "masters_technique",
    ],
    theme: "tools",
  },
  {
    id: "production_path",
    name: "Field Optimization",
    description: "Maximize your paddy field output",
    unlockedAtEra: 1,
    upgradeIds: ["better_seeds", "improved_irrigation", "fertile_soil"],
    theme: "production",
  },
  {
    id: "worker_path",
    name: "Family Excellence",
    description: "Train your family for better productivity",
    unlockedAtEra: 1,
    upgradeIds: ["family_training", "work_songs"],
    theme: "efficiency",
  },
  {
    id: "buffalo_path",
    name: "Buffalo Mastery",
    description: "Maximize your buffalo potential",
    unlockedAtEra: 1,
    upgradeIds: ["buffalo_training", "premium_feed"],
    theme: "efficiency",
  },
  {
    id: "global_path",
    name: "General Improvements",
    description: "Upgrades that benefit everything",
    unlockedAtEra: 1,
    upgradeIds: [
      "early_mornings",
      "efficient_planning",
      "bulk_materials",
      "local_connections",
    ],
    theme: "techniques",
  },
];

export default {
  upgrades,
  upgradePaths,
};
