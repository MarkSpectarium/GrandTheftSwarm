/**
 * Development/Test Mode Configuration
 *
 * This configuration enables accelerated testing of long-term game systems.
 * Use this to test prestige, era transitions, and late-game content without
 * waiting hours or days.
 *
 * USAGE:
 * 1. Import this config in your test or development environment
 * 2. Pass it to the Game constructor via config.devMode
 * 3. The game will run at accelerated speed
 *
 * EXAMPLE:
 *   import { devModeConfig } from './config/balance/devmode.config';
 *   const game = createGame({
 *     config: { ...gameConfig, devMode: devModeConfig.fast },
 *   });
 */

import type { DevModeConfig } from "../types";

/**
 * Disabled - Normal gameplay speed
 */
export const devModeDisabled: DevModeConfig = {
  enabled: false,
  timeMultiplier: 1,
};

/**
 * Fast mode - 10x speed
 * Good for testing short-term progression (minutes feel like seconds)
 */
export const devModeFast: DevModeConfig = {
  enabled: true,
  timeMultiplier: 10,
  logTicks: false,
};

/**
 * Turbo mode - 100x speed
 * Good for testing medium-term progression (hours feel like minutes)
 */
export const devModeTurbo: DevModeConfig = {
  enabled: true,
  timeMultiplier: 100,
  logTicks: false,
};

/**
 * Hyper mode - 1000x speed
 * Good for testing long-term progression (days feel like minutes)
 * Warning: May cause performance issues with very fast ticks
 */
export const devModeHyper: DevModeConfig = {
  enabled: true,
  timeMultiplier: 1000,
  logTicks: false,
};

/**
 * Test mode with starting resources
 * Bypasses early game grind for testing mid/late game features
 */
export const devModeWithResources: DevModeConfig = {
  enabled: true,
  timeMultiplier: 10,
  startingResources: {
    rice: 100000,
    dong: 50000,
  },
  startingBuildings: {
    paddy_field: 5,
    family_worker: 3,
    buffalo: 2,
  },
  unlockAllBuildings: true,
  logTicks: false,
};

/**
 * Era 2 test mode
 * Start with enough progress to immediately test Era 2 content
 */
export const devModeEra2Test: DevModeConfig = {
  enabled: true,
  timeMultiplier: 10,
  startingResources: {
    rice: 2000000, // More than Era 2 unlock requirement
    dong: 100000,
    rice_flour: 10000,
  },
  startingBuildings: {
    paddy_field: 10,
    family_worker: 5,
    buffalo: 3,
    rice_mill: 2,
  },
  unlockAllBuildings: true,
  logTicks: false,
};

/**
 * Debug mode - slow with tick logging
 * For debugging timing issues
 */
export const devModeDebug: DevModeConfig = {
  enabled: true,
  timeMultiplier: 1,
  logTicks: true,
  disableAutoSave: true,
};

/**
 * Preset configurations grouped for easy access
 */
export const devModePresets = {
  disabled: devModeDisabled,
  fast: devModeFast,
  turbo: devModeTurbo,
  hyper: devModeHyper,
  withResources: devModeWithResources,
  era2Test: devModeEra2Test,
  debug: devModeDebug,
} as const;

export default devModePresets;
