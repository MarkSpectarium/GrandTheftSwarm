/**
 * Buildings Configuration
 *
 * Defines all purchasable buildings, their costs, production, and effects.
 * Modify values here to tune building balance.
 *
 * IMPORTANT: Production data (outputs, inputs, baseIntervalMs, idleEfficiency)
 * is sourced from the shared package to ensure consistency with server-side
 * offline calculations. Client-specific fields are added here.
 */

import type { BuildingConfig } from "../types";
import { buildingProductionMap } from 'shared';

/**
 * Helper to get production config from shared definition
 */
function getSharedProduction(buildingId: string) {
  const def = buildingProductionMap[buildingId];
  if (!def) {
    throw new Error(`Building production not found in shared: ${buildingId}`);
  }
  return def.production;
}

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

    // Production - core data from shared, with client-specific additions
    production: {
      ...getSharedProduction("paddy_field"),
      speedStackId: "paddy_speed",
      amountStackId: "paddy_production",
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
      ...getSharedProduction("family_worker"),
      speedStackId: "worker_speed",
      amountStackId: "worker_production",
    },

    effects: [
      {
        stackId: "click_power",
        value: 0.1, // +10% click power per worker
        scalesWithVar: "owned",
        valuePerUnit: 0.1,
      },
    ],

    specialEffects: [
      {
        type: "synergy",
        params: {
          synergyBuilding: "paddy_field",
          synergyBonus: 0.03, // +3% paddy production per worker
        },
        description: "Each worker increases paddy field production by 3%",
      },
    ],

    maxOwned: 10, // Family size limit in Era 1
    resetsOnPrestige: true,
  },

  {
    id: "buffalo",
    name: "Water Buffalo",
    namePlural: "Water Buffalo",
    description: "Strong and steady. Plows fields without rest. Needs water to survive!",
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
      ...getSharedProduction("buffalo"),
      amountStackId: "buffalo_production",
    },

    // Buffalo consume water - they will lose health and die without it!
    consumption: {
      resources: [
        {
          resourceId: "water",
          amountPerTick: 3, // 3 liters per tick per buffalo
          healthLossPerMissing: 1, // Lose 1 health per missing liter
        },
      ],
      maxHealth: 100,
      onDeath: "remove", // Buffalo dies when health reaches 0
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
  // ERA 1: WATER SUPPLIERS
  // ---------------------------------------------------------------------------

  {
    id: "village_well",
    name: "Village Well",
    namePlural: "Village Wells",
    description: "A simple well that provides a steady trickle of water.",
    flavorText: "The village gathers here at dawn.",
    category: "supply",
    unlockedAtEra: 1,
    unlockRequirements: [], // Available from start
    visibleBeforeUnlock: true,
    icon: "well",
    visualTier: 1,

    baseCost: [
      { resourceId: "dong", amount: 50 },
    ],
    costCurve: "cost_standard",
    allowBulkPurchase: true,
    bulkOptions: [1, 10],

    production: {
      ...getSharedProduction("village_well"),
      amountStackId: "water_production",
    },

    resetsOnPrestige: true,
  },

  {
    id: "water_carrier",
    name: "Water Carrier",
    namePlural: "Water Carriers",
    description: "A villager who carries water from the river. Works harder when you're watching!",
    flavorText: "Back and forth, bucket by bucket.",
    category: "supply",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "village_well", count: 1 },
        description: "Own a Village Well",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "carrier",
    visualTier: 1,

    baseCost: [
      { resourceId: "dong", amount: 150 },
    ],
    costCurve: "cost_aggressive",
    allowBulkPurchase: true,
    bulkOptions: [1, 10],

    production: {
      ...getSharedProduction("water_carrier"),
      amountStackId: "water_production",
    },

    maxOwned: 10, // Limited by village population
    resetsOnPrestige: true,
  },

  {
    id: "irrigation_canal",
    name: "Irrigation Canal",
    namePlural: "Irrigation Canals",
    description: "A network of channels that brings river water to your fields. Expensive but efficient.",
    flavorText: "The ancients knew: control water, control life.",
    category: "supply",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "building_owned",
        params: { building: "water_carrier", count: 3 },
        description: "Hire 3 Water Carriers",
      },
      {
        type: "building_owned",
        params: { building: "paddy_field", count: 5 },
        description: "Own 5 Paddy Fields",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "canal",
    visualTier: 1,

    baseCost: [
      { resourceId: "dong", amount: 500 },
      { resourceId: "rice", amount: 2000 },
    ],
    costCurve: "cost_tiered",
    allowBulkPurchase: true,
    bulkOptions: [1, 5],

    production: {
      ...getSharedProduction("irrigation_canal"),
      amountStackId: "water_production",
    },

    specialEffects: [
      {
        type: "synergy",
        params: {
          synergyBuilding: "paddy_field",
          synergyBonus: 0.05, // +5% paddy production per canal
        },
        description: "Each canal increases paddy field production by 5%",
      },
    ],

    resetsOnPrestige: true,
  },

  // ---------------------------------------------------------------------------
  // ERA 1: TRADING
  // ---------------------------------------------------------------------------

  {
    id: "dingy",
    name: "Dingy",
    namePlural: "Dingies",
    description: "A small wooden boat that transports rice to market and sells it for Dong.",
    flavorText: "Row, row, row your boat, gently down the stream...",
    category: "transport",
    unlockedAtEra: 1,
    unlockRequirements: [
      {
        type: "resource_lifetime",
        params: { resource: "rice", amount: 500 },
        description: "Harvest 500 rice",
      },
    ],
    visibleBeforeUnlock: true,
    icon: "dingy",
    visualTier: 1,

    // First dingy costs rice, subsequent ones cost dong with 5x scaling
    baseCost: [
      { resourceId: "rice", amount: 1000 },
    ],
    subsequentCost: [
      { resourceId: "dong", amount: 1000 },
    ],
    costCurve: "cost_dingy_5x", // 5x increase per purchase
    allowBulkPurchase: false, // Expensive, no bulk buying

    production: {
      ...getSharedProduction("dingy"),
      speedStackId: "dingy_speed",
      amountStackId: "dingy_profit",
      batchProduction: true, // Complete trips - waits 10s, then sells all at once
    },

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
      ...getSharedProduction("rice_mill"),
      amountStackId: "mill_production",
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
      ...getSharedProduction("sampan"),
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
      ...getSharedProduction("motorboat"),
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
      ...getSharedProduction("harvest_drone"),
      outputs: [
        {
          ...getSharedProduction("harvest_drone").outputs[0],
          scalingCurve: "production_synergy",
        },
      ],
      amountStackId: "drone_production",
    },

    effects: [
      {
        stackId: "all_production",
        value: 0.01, // +1% all production per drone
        scalesWithVar: "owned",
        valuePerUnit: 0.01,
      },
    ],

    specialEffects: [
      {
        type: "synergy",
        params: {
          synergyBuilding: "paddy_field",
          synergyBonus: 0.02, // +2% paddy production per drone
        },
        description: "Each drone increases paddy field production by 2%",
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
