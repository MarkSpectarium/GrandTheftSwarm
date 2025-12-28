/**
 * Icon Registry - Centralized icon and display name mappings
 *
 * This file contains all icon mappings for resources, buildings, and other
 * game entities. Edit this file to update icons without touching rendering code.
 */

/**
 * Resource icons by resource ID
 */
export const resourceIcons: Record<string, string> = {
  // Era 1: Roots
  rice: "🌾",
  dong: "💰",
  water: "💧",

  // Era 2: Growth
  rice_flour: "🍚",
  rice_noodles: "🍜",
  ancestral_wisdom: "📜",

  // Era 3+: Future
  lotus_token: "🪷",
};

/**
 * Building icons by building ID
 */
export const buildingIcons: Record<string, string> = {
  // Era 1: Roots - Production
  paddy_field: "🟩",
  family_worker: "👨‍🌾",
  buffalo: "🐃",

  // Era 1: Roots - Water Supply
  village_well: "⛲",
  water_carrier: "🚶",
  irrigation_canal: "🌊",

  // Era 2: Growth
  rice_mill: "🏭",
  sampan: "🚣",
  noodle_workshop: "🍜",

  // Era 3+: Future
  motorboat: "🚤",
  harvest_drone: "🤖",
};

/**
 * Upgrade icons by upgrade ID
 */
export const upgradeIcons: Record<string, string> = {
  // Click upgrades
  calloused_hands: "✊",
  bamboo_sickle: "🎋",
  iron_sickle: "🔪",
  masters_technique: "📜",

  // Production upgrades
  better_seeds: "🌱",
  improved_irrigation: "💧",
  fertile_soil: "🪴",

  // Worker upgrades
  family_training: "👨‍👩‍👧‍👦",
  work_songs: "🎵",

  // Buffalo upgrades
  buffalo_training: "🐃",
  premium_feed: "🌿",

  // Global upgrades
  early_mornings: "🌅",
  efficient_planning: "📋",

  // Cost reduction upgrades
  bulk_materials: "📦",
  local_connections: "🤝",
};

/**
 * Default icons for unknown entities
 */
export const defaultIcons = {
  resource: "📦",
  building: "🏠",
  upgrade: "⬆️",
  event: "🎉",
} as const;

/**
 * Get icon for a resource
 */
export function getResourceIcon(resourceId: string): string {
  return resourceIcons[resourceId] ?? defaultIcons.resource;
}

/**
 * Get icon for a building
 */
export function getBuildingIcon(buildingId: string): string {
  return buildingIcons[buildingId] ?? defaultIcons.building;
}

/**
 * Get icon for an upgrade
 */
export function getUpgradeIcon(upgradeId: string): string {
  return upgradeIcons[upgradeId] ?? defaultIcons.upgrade;
}

/**
 * Icon registry for centralized access
 */
export const iconRegistry = {
  resources: resourceIcons,
  buildings: buildingIcons,
  upgrades: upgradeIcons,
  defaults: defaultIcons,
  getResourceIcon,
  getBuildingIcon,
  getUpgradeIcon,
} as const;

export default iconRegistry;
