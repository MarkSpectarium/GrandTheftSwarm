/**
 * Core Module Exports
 */

export { EventBus } from "./EventBus";
export type { GameEventType, GameEventPayload } from "./EventBus";

export { GameLoop } from "./GameLoop";
export type { GameLoopState } from "./GameLoop";

export { CurveEvaluator, getCurveEvaluator, initializeCurveEvaluator } from "./CurveEvaluator";

export { MultiplierSystem } from "./MultiplierSystem";
export type { ActiveMultiplier, MultiplierStack, ConditionContext } from "./MultiplierSystem";
