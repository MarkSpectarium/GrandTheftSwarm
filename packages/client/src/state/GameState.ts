/**
 * GameState types and factory functions
 */

export {
  type ResourceState,
  type BuildingState,
  type UpgradeState,
  type EventState,
  type PrestigeState,
  type StatisticsState,
  type SettingsState,
  type GameState,
  type SerializableGameState,
  type RuntimeGameState,
  toRuntimeState,
  toSerializableState,
  createInitialGameState,
  createResourceState,
  createBuildingState,
  createUpgradeState,
} from 'shared';
