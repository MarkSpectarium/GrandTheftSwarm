/**
 * Curve Presets Configuration
 *
 * Reusable curve definitions that can be referenced by ID throughout the game.
 * When tuning balance, modify these values - the game engine will use them automatically.
 */

import type { CurvePreset } from "../types";

/**
 * Standard curve presets used across the game
 */
export const curvePresets: CurvePreset[] = [
  // ===========================================================================
  // COST CURVES
  // ===========================================================================

  {
    id: "cost_standard",
    name: "Standard Cost Scaling",
    description: "15% increase per purchase, like Cookie Clicker buildings",
    curve: {
      type: "exponential",
      base: 1, // Multiplied by building's baseCost
      rate: 1.15,
      countVar: "owned",
    },
  },

  {
    id: "cost_aggressive",
    name: "Aggressive Cost Scaling",
    description: "25% increase per purchase, for powerful buildings",
    curve: {
      type: "exponential",
      base: 1,
      rate: 1.25,
      countVar: "owned",
    },
  },

  {
    id: "cost_gentle",
    name: "Gentle Cost Scaling",
    description: "8% increase per purchase, for early game buildings",
    curve: {
      type: "exponential",
      base: 1,
      rate: 1.08,
      countVar: "owned",
    },
  },

  {
    id: "cost_tiered",
    name: "Tiered Cost Scaling",
    description: "Jumps at milestones: 10, 25, 50, 100 owned",
    curve: {
      type: "compound",
      operation: "multiply",
      curves: [
        {
          type: "exponential",
          base: 1,
          rate: 1.15,
          countVar: "owned",
        },
        {
          type: "step",
          inputVar: "owned",
          steps: [
            { threshold: 0, value: 1 },
            { threshold: 10, value: 1.5 },
            { threshold: 25, value: 2 },
            { threshold: 50, value: 3 },
            { threshold: 100, value: 5 },
          ],
        },
      ],
    },
  },

  {
    id: "cost_dingy_5x",
    name: "Dingy Cost Scaling (5x)",
    description: "5x increase per purchase, for trading boats",
    curve: {
      type: "exponential",
      base: 1,
      rate: 5,
      countVar: "owned",
    },
  },

  // ===========================================================================
  // PRODUCTION CURVES
  // ===========================================================================

  {
    id: "production_linear",
    name: "Linear Production",
    description: "Each building adds flat amount",
    curve: {
      type: "linear",
      base: 0,
      rate: 1, // Multiplied by building's baseAmount
      countVar: "owned",
    },
  },

  {
    id: "production_synergy",
    name: "Synergy Production",
    description: "Slight bonus per additional building (1% per)",
    curve: {
      type: "formula",
      expression: "owned * (1 + (owned - 1) * 0.01)",
    },
  },

  {
    id: "production_diminishing",
    name: "Diminishing Returns",
    description: "Each building adds less than the previous",
    curve: {
      type: "logarithmic",
      coefficient: 10,
      logBase: 2,
      offset: 1,
      valueVar: "owned",
    },
  },

  // ===========================================================================
  // PRESTIGE CURVES
  // ===========================================================================

  {
    id: "prestige_cubic",
    name: "Cubic Prestige (Cookie Clicker Style)",
    description: "Prestige points = (lifetime / 1e12) ^ (1/3)",
    curve: {
      type: "polynomial",
      coefficient: 1,
      power: 0.333333, // Cube root (1/3)
      valueVar: "lifetimeRice_div_1e12",
    },
  },

  {
    id: "prestige_quadratic",
    name: "Quadratic Prestige (Faster)",
    description: "Prestige points = (lifetime / 1e9) ^ (1/2)",
    curve: {
      type: "polynomial",
      coefficient: 1,
      power: 0.5, // Square root
      valueVar: "lifetimeRice_div_1e9",
    },
  },

  {
    id: "prestige_bonus_per_point",
    name: "Prestige Bonus Per Point",
    description: "2% additive bonus per prestige point",
    curve: {
      type: "linear",
      base: 1,
      rate: 0.02, // 2% per point
      countVar: "prestigePoints",
    },
  },

  // ===========================================================================
  // UPGRADE EFFECT CURVES
  // ===========================================================================

  {
    id: "upgrade_double",
    name: "Doubling Upgrade",
    description: "Each tier doubles the effect",
    curve: {
      type: "exponential",
      base: 1,
      rate: 2,
      countVar: "tier",
    },
  },

  {
    id: "upgrade_additive_10",
    name: "+10% Per Tier",
    description: "Each tier adds 10%",
    curve: {
      type: "linear",
      base: 1,
      rate: 0.1,
      countVar: "tier",
    },
  },

  // ===========================================================================
  // TRAVEL TIME CURVES
  // ===========================================================================

  {
    id: "travel_base",
    name: "Base Travel Time",
    description: "60 seconds + 30 per distance unit",
    curve: {
      type: "linear",
      base: 60,
      rate: 30,
      countVar: "distance",
    },
  },

  {
    id: "travel_speed_reduction",
    name: "Speed Reduces Travel",
    description: "Divides time by speed factor",
    curve: {
      type: "formula",
      expression: "baseTime / (1 + boatSpeed * 0.1)",
    },
  },

  // ===========================================================================
  // EVENT CURVES
  // ===========================================================================

  {
    id: "event_reward_scaling",
    name: "Event Reward Scaling",
    description: "Rewards scale with era and production",
    curve: {
      type: "formula",
      expression: "baseReward * (1 + era * 0.5) * (1 + log10(productionPerSec + 1) * 0.1)",
    },
  },

  {
    id: "event_chance_base",
    name: "Base Event Chance",
    description: "0.1% per tick base chance",
    curve: {
      type: "constant",
      value: 0.001,
    },
  },
];

export default curvePresets;
