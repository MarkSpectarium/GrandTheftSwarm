/**
 * Core Module Exports
 */

export { EventBus, SubscriptionManager } from "./EventBus";
export type { GameEventType, GameEventPayload } from "./EventBus";

export { GameLoop } from "./GameLoop";
export type { GameLoopState } from "./GameLoop";

export { CurveEvaluator, getCurveEvaluator, initializeCurveEvaluator } from "./CurveEvaluator";

export { MultiplierSystem } from "./MultiplierSystem";
export type { ActiveMultiplier, MultiplierStack } from "./MultiplierSystem";

export {
  ConditionEvaluator,
  getConditionEvaluator,
  createConditionEvaluator,
} from "./ConditionEvaluator";
export type { ConditionContext, ConditionStrategy } from "./ConditionEvaluator";
