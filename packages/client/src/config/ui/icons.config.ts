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
  // Era 1: Roots
  paddy_field: "🟩",
  family_worker: "👨‍🌾",
  buffalo: "🐃",

  // Era 2: Growth
  rice_mill: "🏭",
  sampan: "🚣",
  noodle_workshop: "🍜",

  // Era 3+: Future
  harvest_drone: "🤖",
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
 * Icon registry for centralized access
 */
export const iconRegistry = {
  resources: resourceIcons,
  buildings: buildingIcons,
  defaults: defaultIcons,
  getResourceIcon,
  getBuildingIcon,
} as const;

export default iconRegistry;
