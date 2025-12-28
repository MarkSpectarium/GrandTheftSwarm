/**
 * State Module Exports
 */

export { StateManager } from "./StateManager";

export {
  createInitialGameState,
  createResourceState,
  createBuildingState,
  createUpgradeState,
  toRuntimeState,
  toSerializableState,
} from "./GameState";

export type {
  GameState,
  SerializableGameState,
  RuntimeGameState,
  ResourceState,
  BuildingState,
  UpgradeState,
  EventState,
  PrestigeState,
  StatisticsState,
  SettingsState,
} from "./GameState";
