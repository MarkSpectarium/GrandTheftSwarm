/**
 * Resources Configuration
 *
 * Defines all resources in the game, their properties, and behaviors.
 * Add new resources here - no code changes needed.
 */

import type { ResourceConfig, ResourceConversionConfig, MarketPriceConfig } from "../types";

// =============================================================================
// PRIMARY RESOURCES
// =============================================================================

export const resources: ResourceConfig[] = [
  // ---------------------------------------------------------------------------
  // ERA 1: CORE RESOURCES
  // ---------------------------------------------------------------------------

  {
    id: "rice",
    name: "Rice",
    namePlural: "Rice",
    description: "The foundation of your farming empire. Harvested from paddy fields.",
    category: "primary",
    icon: "rice",
    color: "#F5DEB3", // Wheat color
    unlockedAtEra: 1,
    initialAmount: 0,
    maxCapacity: undefined, // Unlimited
    persistsOnPrestige: false,
    visibleBeforeUnlock: true,
    displayDecimals: 0,
    acquisitionMethods: [
      { type: "click", description: "Harvest manually by clicking" },
      { type: "building", description: "Produced by paddy fields and workers" },
      { type: "event", description: "Bonus from monsoon blessings" },
    ],
    sinkMethods: [
      { type: "purchase", description: "Spent on buildings and upgrades" },
      { type: "conversion", description: "Processed into flour and noodles" },
      { type: "trade", description: "Sold at markets for Dong" },
    ],
  },

  {
    id: "dong",
    name: "Dong",
    namePlural: "Dong",
    description: "Vietnamese currency. Used to purchase upgrades and hire workers.",
    category: "currency",
    icon: "dong",
    color: "#FFD700", // Gold
    unlockedAtEra: 1,
    initialAmount: 0,
    maxCapacity: undefined,
    persistsOnPrestige: false,
    visibleBeforeUnlock: false, // Hidden until first earned
    displayDecimals: 0,
    formatting: {
      prefix: "₫",
    },
    acquisitionMethods: [
      { type: "trade", description: "Selling rice at the village market" },
      { type: "event", description: "Lucky finds and bonuses" },
    ],
    sinkMethods: [
      { type: "purchase", description: "Buying upgrades and hiring workers" },
    ],
  },

  // ---------------------------------------------------------------------------
  // ERA 2: PROCESSED GOODS
  // ---------------------------------------------------------------------------

  {
    id: "rice_flour",
    name: "Rice Flour",
    namePlural: "Rice Flour",
    description: "Processed rice, more valuable than raw grain.",
    category: "secondary",
    icon: "flour",
    color: "#FFFAF0", // Floral white
    unlockedAtEra: 2,
    initialAmount: 0,
    maxCapacity: undefined,
    persistsOnPrestige: false,
    visibleBeforeUnlock: false,
    displayDecimals: 0,
    acquisitionMethods: [
      { type: "conversion", description: "Processed at rice mills" },
    ],
    sinkMethods: [
      { type: "conversion", description: "Used to make noodles" },
      { type: "trade", description: "Sold for higher prices than raw rice" },
    ],
  },

  {
    id: "rice_noodles",
    name: "Rice Noodles",
    namePlural: "Rice Noodles",
    description: "Finished product with high market value.",
    category: "secondary",
    icon: "noodles",
    color: "#FFF8DC", // Cornsilk
    unlockedAtEra: 2,
    initialAmount: 0,
    maxCapacity: undefined,
    persistsOnPrestige: false,
    visibleBeforeUnlock: false,
    displayDecimals: 0,
    acquisitionMethods: [
      { type: "conversion", description: "Made from rice flour" },
    ],
    sinkMethods: [
      { type: "trade", description: "Best prices at district markets" },
    ],
  },

  // ---------------------------------------------------------------------------
  // PRESTIGE CURRENCIES
  // ---------------------------------------------------------------------------

  {
    id: "ancestral_wisdom",
    name: "Ancestral Wisdom",
    namePlural: "Ancestral Wisdom",
    description: "Knowledge passed down through generations. Permanent bonuses that persist through resets.",
    category: "prestige",
    icon: "wisdom",
    color: "#9370DB", // Medium purple
    unlockedAtEra: 2,
    initialAmount: 0,
    maxCapacity: undefined,
    persistsOnPrestige: true, // Key difference!
    visibleBeforeUnlock: false,
    displayDecimals: 0,
    acquisitionMethods: [
      { type: "prestige", description: "Earned by performing a generational reset" },
    ],
    sinkMethods: [
      { type: "purchase", description: "Spent in the Ancestral Shop" },
    ],
  },

  {
    id: "lotus_tokens",
    name: "Lotus Token",
    namePlural: "Lotus Tokens",
    description: "Premium currency for special purchases.",
    category: "currency",
    icon: "lotus",
    color: "#FF69B4", // Hot pink
    unlockedAtEra: 1,
    initialAmount: 0,
    maxCapacity: undefined,
    persistsOnPrestige: true,
    visibleBeforeUnlock: false,
    displayDecimals: 0,
    acquisitionMethods: [
      { type: "achievement", description: "Earned from achievements" },
      { type: "event", description: "Rare event rewards" },
    ],
    sinkMethods: [
      { type: "purchase", description: "Cosmetics and quality-of-life upgrades" },
    ],
  },

  // ---------------------------------------------------------------------------
  // ERA 2: FUEL RESOURCES
  // ---------------------------------------------------------------------------

  {
    id: "river_water",
    name: "River Water",
    namePlural: "River Water",
    description: "Used for irrigation and processing. Replenishes over time.",
    category: "fuel",
    icon: "water",
    color: "#4169E1", // Royal blue
    unlockedAtEra: 1,
    initialAmount: 100,
    maxCapacity: 500,
    persistsOnPrestige: false,
    visibleBeforeUnlock: false,
    displayDecimals: 0,
    acquisitionMethods: [
      { type: "idle", description: "Naturally replenishes from the river" },
      { type: "building", description: "Wells and pumps increase capacity" },
    ],
    sinkMethods: [
      { type: "fuel", description: "Consumed by production buildings" },
    ],
  },
];

// =============================================================================
// RESOURCE CONVERSIONS (PRODUCTION CHAINS)
// =============================================================================

export const conversions: ResourceConversionConfig[] = [
  {
    id: "rice_to_flour",
    name: "Mill Rice",
    inputs: [
      { resourceId: "rice", amount: 10 },
    ],
    outputs: [
      { resourceId: "rice_flour", amount: 5 },
    ],
    durationMs: 5000, // 5 seconds
    unlockedAtEra: 2,
    buildingId: "rice_mill",
    canAutomate: true,
  },

  {
    id: "flour_to_noodles",
    name: "Make Noodles",
    inputs: [
      { resourceId: "rice_flour", amount: 5 },
      { resourceId: "river_water", amount: 2 },
    ],
    outputs: [
      { resourceId: "rice_noodles", amount: 3 },
    ],
    durationMs: 10000, // 10 seconds
    unlockedAtEra: 2,
    buildingId: "noodle_workshop",
    canAutomate: true,
  },
];

// =============================================================================
// MARKET PRICES
// =============================================================================

export const marketPrices: MarketPriceConfig[] = [
  {
    resourceId: "rice",
    basePrice: 1, // 1 dong per rice
    fluctuation: {
      minMultiplier: 0.8,
      maxMultiplier: 1.2,
      changeIntervalMs: 60000, // Price changes every minute
      maxChangePercent: 5,
    },
  },

  {
    resourceId: "rice_flour",
    basePrice: 3, // 3 dong per flour (better than raw rice conversion)
    fluctuation: {
      minMultiplier: 0.7,
      maxMultiplier: 1.5,
      changeIntervalMs: 120000,
      maxChangePercent: 10,
    },
  },

  {
    resourceId: "rice_noodles",
    basePrice: 10, // Best margins on finished goods
    fluctuation: {
      minMultiplier: 0.6,
      maxMultiplier: 2.0,
      changeIntervalMs: 180000,
      maxChangePercent: 15,
    },
    supplyDemand: {
      sellPressure: {
        type: "logarithmic",
        coefficient: -0.1,
        logBase: 10,
        offset: 1,
        valueVar: "recentSales",
      },
      recoveryRate: 0.01, // 1% recovery per minute
      minPriceMultiplier: 0.3,
    },
  },
];

export default {
  resources,
  conversions,
  marketPrices,
};
