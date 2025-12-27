/**
 * Curve Type Definitions
 *
 * These types define the mathematical curves used throughout the game
 * for cost scaling, production rates, and progression systems.
 */

// =============================================================================
// BASE CURVE TYPES
// =============================================================================

/**
 * Exponential curve: base * (rate ^ count)
 * Use for: Building costs, upgrade prices
 */
export interface ExponentialCurve {
  type: "exponential";
  /** Starting value before any scaling */
  base: number;
  /** Growth rate per unit (e.g., 1.15 = 15% increase) */
  rate: number;
  /** Variable reference for the exponent (e.g., "owned", "purchased") */
  countVar: string;
}

/**
 * Exponential with offset: base * (rate ^ (count + offset))
 * Use for: Mid-game unlocks that need steeper starting costs
 */
export interface ExponentialOffsetCurve {
  type: "exponential_offset";
  base: number;
  rate: number;
  /** Shifts the curve start point */
  offset: number;
  countVar: string;
}

/**
 * Polynomial curve: coefficient * (value ^ power)
 * Use for: Prestige scaling (cubic), diminishing returns (sqrt)
 */
export interface PolynomialCurve {
  type: "polynomial";
  /** Multiplier applied to result */
  coefficient: number;
  /** Exponent (2 = quadratic, 3 = cubic, 0.5 = sqrt) */
  power: number;
  /** Variable reference for the base value */
  valueVar: string;
}

/**
 * Linear curve: base + (rate * count)
 * Use for: Simple scaling, additive bonuses
 */
export interface LinearCurve {
  type: "linear";
  /** Starting value */
  base: number;
  /** Amount added per unit */
  rate: number;
  /** Variable reference for the multiplier */
  countVar: string;
}

/**
 * Logarithmic curve: coefficient * log(logBase, value + offset)
 * Use for: Diminishing returns, soft caps
 */
export interface LogarithmicCurve {
  type: "logarithmic";
  coefficient: number;
  /** Base of the logarithm (10 for log10, 2.718... for ln) */
  logBase: number;
  /** Added to value to prevent log(0) */
  offset: number;
  valueVar: string;
}

/**
 * Sigmoid curve: max / (1 + e^(-steepness * (value - midpoint)))
 * Use for: Soft caps approaching a maximum, S-curve progression
 */
export interface SigmoidCurve {
  type: "sigmoid";
  /** Maximum value the curve approaches */
  max: number;
  /** How sharp the S-curve transition is */
  steepness: number;
  /** Value at which output equals max/2 */
  midpoint: number;
  valueVar: string;
}

/**
 * Step curve: Returns value of highest threshold passed
 * Use for: Era unlocks, discrete tier bonuses
 */
export interface StepCurve {
  type: "step";
  /** Thresholds in ascending order */
  steps: StepThreshold[];
  /** Variable to compare against thresholds */
  inputVar: string;
}

export interface StepThreshold {
  /** Minimum value to reach this step */
  threshold: number;
  /** Value returned when this step is active */
  value: number;
}

/**
 * Constant value: Always returns the same number
 * Use for: Base values, fixed amounts
 */
export interface ConstantCurve {
  type: "constant";
  value: number;
}

/**
 * Formula expression: Evaluates a string expression
 * Use for: Complex formulas that don't fit other patterns
 */
export interface FormulaCurve {
  type: "formula";
  /**
   * Expression string supporting:
   * - Operators: + - * / ^ ( )
   * - Functions: min, max, floor, ceil, log, log10, sqrt, abs
   * - Constants: e, pi
   * - Variables: Referenced by name from game state
   *
   * Example: "base * 1.15 ^ owned + bonus"
   */
  expression: string;
}

// =============================================================================
// COMPOUND CURVES
// =============================================================================

/**
 * Compound curve: Combines multiple curves with an operation
 * Use for: Complex calculations requiring multiple curve types
 */
export interface CompoundCurve {
  type: "compound";
  /** How to combine the curve results */
  operation: CompoundOperation;
  /** Curves to combine (evaluated in order) */
  curves: Curve[];
}

export type CompoundOperation =
  | "add"      // Sum all curve results
  | "multiply" // Product of all curve results
  | "min"      // Minimum of all curve results
  | "max"      // Maximum of all curve results
  | "subtract" // First curve minus sum of rest
  | "divide";  // First curve divided by product of rest

// =============================================================================
// UNION TYPE
// =============================================================================

/**
 * Any valid curve configuration
 */
export type Curve =
  | ExponentialCurve
  | ExponentialOffsetCurve
  | PolynomialCurve
  | LinearCurve
  | LogarithmicCurve
  | SigmoidCurve
  | StepCurve
  | ConstantCurve
  | FormulaCurve
  | CompoundCurve;

// =============================================================================
// CURVE PRESETS (commonly used configurations)
// =============================================================================

/**
 * Named curve presets that can be referenced by ID
 */
export interface CurvePreset {
  id: string;
  name: string;
  description: string;
  curve: Curve;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * A curve reference can be either:
 * - An inline curve definition
 * - A string ID referencing a preset
 */
export type CurveRef = Curve | string;

/**
 * Context passed to curve evaluation
 */
export interface CurveContext {
  [variableName: string]: number;
}
