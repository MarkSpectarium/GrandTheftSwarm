/**
 * Buildings Configuration
 *
 * Defines all purchasable buildings, their costs, production, and effects.
 * Modify values here to tune building balance.
 */

import type { BuildingConfig } from "../types";

// =============================================================================
// ERA 1 BUILDINGS
// =============================================================================

export const buildings: BuildingConfig[] = [
  // ---------------------------------------------------------------------------
  // PRODUCTION BUILDINGS
  // ---------------------------------------------------------------------------

  {
    id: "paddy_field",
    name: "Paddy Field",
    namePlural: "Paddy Fields",
    description: "A flooded rice paddy. The foundation of your farm.",
    flavorText: "The water buffalo doesn't mind the mud.",
    category: "production",
    unlockedAtEra: 1,
    unlockRequirements: [], // Available from start
    visibleBeforeUnlock: true,
    icon: "paddy",
    visualTier: 1,

    // Cost
    baseCost: [
      { resourceId: "rice", amount: 50 },
    ],
    costCurve: "cost_standard", // References curve preset
    allowBulkPurchase: true,
    bulkOptions: [1, 10, 100],

    // Production
    production: {
      outputs: [
        {
          resourceId: "rice",
          baseAmount: 0.5, // 0.5 rice per second per field
        },
      ],
      baseIntervalMs: 1000,
      speedStackId: "paddy_speed",
      amountStackId: "paddy_production",
      requiresActive: false,
      idleEfficiency: 1.0, // Full production while idle
    },

    // No special effects for basic building
    resetsOnPrestige: true,
  },

  {
    id: "family_worker",
    name: "Family Member",
    namePlural: "Family Members",
    description: "A family member helping with the harvest.",
    flavorText: "Many hands make light work.",
    category: "automation",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 100 },
        description: "Harvest 100 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "worker",
    visualTier: 1,

    baseCost: [
      { resourceId: "rice", amount: 200 },
    ],
    costCurve: "cost_aggressive", // Workers get expensive fast
    allowBulkPurchase: true,
    bulkOptions: [1, 10],

    production: {
      outputs: [
        {
          resourceId: "rice",
          baseAmount: 1.0, // 1 rice per second
        },
      ],
      baseIntervalMs: 1000,
      speedStackId: "worker_speed",
      amountStackId: "worker_production",
      requiresActive: false,
      idleEfficiency: 0.8, // Slightly less productive when you're away
    },

    effects: [
      {
        stackId: "click_power",
        value: 0.1, // +10% click power per worker
        scalesWithVar: "owned",
        valuePerUnit: 0.1,
      },
    ],

    maxOwned: 10, // Family size limit in Era 1
    resetsOnPrestige: true,
  },

  {
    id: "buffalo",
    name: "Water Buffalo",
    namePlural: "Water Buffalo",
    description: "Strong and steady. Plows fields without rest.",
    flavorText: "A farmer's best friend since ancient times.",
    category: "automation",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "paddy_field", count: 3 },
        description: "Own 3 Paddy Fields",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "buffalo",
    visualTier: 1,

    baseCost: [
      { resourceId: "rice", amount: 1000 },
    ],
    costCurve: "cost_tiered",
    allowBulkPurchase: true,
    bulkOptions: [1, 10],

    production: {
      outputs: [
        {
          resourceId: "rice",
          baseAmount: 5.0, // 5 rice per second - strong early game
        },
      ],
      baseIntervalMs: 1000,
      amountStackId: "buffalo_production",
      requiresActive: false,
      idleEfficiency: 1.0, // Buffalo work regardless
    },

    specialEffects: [
      {
        type: "synergy",
        params: {
          synergyBuilding: "paddy_field",
          synergyBonus: 0.1, // +10% paddy production per buffalo
        },
        description: "Each buffalo increases paddy field production by 10%",
      },
    ],

    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // ERA 2 BUILDINGS
  // ---------------------------------------------------------------------------

  {
    id: "rice_mill",
    name: "Rice Mill",
    namePlural: "Rice Mills",
    description: "Processes raw rice into valuable flour.",
    flavorText: "The sound of progress grinding forward.",
    category: "processing",
    unlockedAtEra: 2,
    unlockRequirements: [],
    visibleBeforeUnlock: false,
    icon: "mill",
    visualTier: 2,

    baseCost: [
      { resourceId: "rice", amount: 10000 },
      { resourceId: "dong", amount: 500 },
    ],
    costCurve: "cost_standard",
    allowBulkPurchase: true,
    bulkOptions: [1, 10],

    production: {
      outputs: [
        {
          resourceId: "rice_flour",
          baseAmount: 1.0,
        },
      ],
      inputs: [
        { resourceId: "rice", amount: 2 }, // Consumes 2 rice per cycle
      ],
      baseIntervalMs: 2000, // Every 2 seconds
      amountStackId: "mill_production",
      requiresActive: false,
      idleEfficiency: 1.0,
    },

    resetsOnPrestige: true,
  },

  {
    id: "sampan",
    name: "Sampan",
    namePlural: "Sampans",
    description: "Traditional flat-bottomed boat for river transport.",
    flavorText: "The rivers are our highways.",
    category: "transport",
    unlockedAtEra: 2,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "rice_mill", count: 1 },
        description: "Own a Rice Mill",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "sampan",
    visualTier: 2,

    baseCost: [
      { resourceId: "dong", amount: 1000 },
    ],
    costCurve: "cost_gentle",
    allowBulkPurchase: true,
    bulkOptions: [1, 5],

    production: {
      outputs: [], // Boats don't produce directly
      baseIntervalMs: 0,
      requiresActive: false,
      idleEfficiency: 1.0,
    },

    effects: [
      {
        stackId: "trade_capacity",
        value: 100, // Each sampan adds 100 cargo capacity
      },
    ],

    specialEffects: [
      {
        type: "unlock_feature",
        params: { featureId: "river_trade" },
        description: "Unlocks river trading routes",
      },
    ],

    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // ERA 3 BUILDINGS (Examples)
  // ---------------------------------------------------------------------------

  {
    id: "motorboat",
    name: "Motorboat",
    namePlural: "Motorboats",
    description: "Faster transport with larger cargo capacity.",
    flavorText: "The future flows on diesel.",
    category: "transport",
    unlockedAtEra: 3,
    unlockRequirements: [],
    visibleBeforeUnlock: false,
    icon: "motorboat",
    visualTier: 3,

    baseCost: [
      { resourceId: "dong", amount: 50000 },
    ],
    costCurve: "cost_standard",
    allowBulkPurchase: true,
    bulkOptions: [1, 10],

    production: {
      outputs: [],
      baseIntervalMs: 0,
      requiresActive: false,
      idleEfficiency: 1.0,
    },

    effects: [
      {
        stackId: "trade_capacity",
        value: 500,
      },
      {
        stackId: "travel_speed",
        value: 0.5, // 50% faster travel
      },
    ],

    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // ERA 4 BUILDINGS (Examples)
  // ---------------------------------------------------------------------------

  {
    id: "harvest_drone",
    name: "Harvest Drone",
    namePlural: "Harvest Drones",
    description: "Autonomous aerial harvesters. The future is now.",
    flavorText: "They never sleep. They never stop.",
    category: "automation",
    unlockedAtEra: 4,
    unlockRequirements: [],
    visibleBeforeUnlock: false,
    icon: "drone",
    visualTier: 4,

    baseCost: [
      { resourceId: "dong", amount: 1000000 },
    ],
    costCurve: "cost_aggressive",
    allowBulkPurchase: true,
    bulkOptions: [1, 10, 100],

    production: {
      outputs: [
        {
          resourceId: "rice",
          baseAmount: 1000, // Massive production
          scalingCurve: "production_synergy",
        },
      ],
      baseIntervalMs: 1000,
      amountStackId: "drone_production",
      requiresActive: false,
      idleEfficiency: 1.0,
    },

    effects: [
      {
        stackId: "all_production",
        value: 0.01, // +1% all production per drone
        scalesWithVar: "owned",
        valuePerUnit: 0.01,
      },
    ],

    resetsOnPrestige: true,
  },
];

// =============================================================================
// BUILDING TIER UPGRADES
// =============================================================================

export const buildingTiers = [
  {
    buildingId: "paddy_field",
    tiers: [
      {
        tier: 2,
        namePrefix: "Improved",
        requirements: [
          {
            type: "building_owned" as const,
            params: { building: "paddy_field", count: 10 },
            description: "Own 10 Paddy Fields",
          },
        ],
        upgradeCost: [
          { resourceId: "dong", amount: 5000 },
        ],
        productionMultiplier: 2.0,
      },
      {
        tier: 3,
        namePrefix: "Advanced",
        requirements: [
          {
            type: "era_reached" as const,
            params: { era: 2 },
            description: "Reach Era 2",
          },
        ],
        upgradeCost: [
          { resourceId: "dong", amount: 50000 },
        ],
        productionMultiplier: 5.0,
      },
    ],
  },
];

export default {
  buildings,
  buildingTiers,
};
