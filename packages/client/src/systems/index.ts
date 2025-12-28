/**
 * Systems Module Exports
 */

export { ResourceSystem } from "./ResourceSystem";
export type { ProductionRate } from "./ResourceSystem";

export { BuildingSystem } from "./BuildingSystem";
export type { BuildingCost, BuildingInfo } from "./BuildingSystem";

export { ConsumptionSystem } from "./ConsumptionSystem";
export type { ConsumptionInfo, HealthInfo } from "./ConsumptionSystem";

export { SaveSystem } from "./SaveSystem";
export type {
  LocalSaveData,
  SaveSystemConfig,
  ConflictResolution,
  ConflictInfo,
} from "./SaveSystem";
