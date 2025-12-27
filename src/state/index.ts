/**
 * State Module Exports
 */

export { StateManager } from "./StateManager";

export {
  createInitialGameState,
  createResourceState,
  createBuildingState,
  createUpgradeState,
} from "./GameState";

export type {
  GameState,
  ResourceState,
  BuildingState,
  UpgradeState,
  EventState,
  PrestigeState,
  StatisticsState,
  SettingsState,
} from "./GameState";
