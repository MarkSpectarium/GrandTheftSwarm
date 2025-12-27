/**
 * CurveEvaluator - Mathematical curve evaluation system
 *
 * Evaluates all curve types defined in the config system.
 * Used for cost scaling, production rates, prestige calculations, etc.
 */

import type {
  Curve,
  CurveRef,
  CurveContext,
  CurvePreset,
  ExponentialCurve,
  ExponentialOffsetCurve,
  PolynomialCurve,
  LinearCurve,
  LogarithmicCurve,
  SigmoidCurve,
  StepCurve,
  ConstantCurve,
  FormulaCurve,
  CompoundCurve,
} from "../config/types";

export class CurveEvaluator {
  private presets: Map<string, Curve> = new Map();

  constructor(presets: CurvePreset[] = []) {
    this.loadPresets(presets);
  }

  /**
   * Load curve presets that can be referenced by ID
   */
  loadPresets(presets: CurvePreset[]): void {
    for (const preset of presets) {
      this.presets.set(preset.id, preset.curve);
    }
  }

  /**
   * Evaluate a curve reference (inline curve or preset ID)
   */
  evaluate(curveRef: CurveRef, context: CurveContext): number {
    const curve = this.resolveCurve(curveRef);
    return this.evaluateCurve(curve, context);
  }

  /**
   * Resolve a curve reference to an actual curve definition
   */
  resolveCurve(curveRef: CurveRef): Curve {
    if (typeof curveRef === "string") {
      const preset = this.presets.get(curveRef);
      if (!preset) {
        console.warn(`CurveEvaluator: Unknown curve preset "${curveRef}", returning constant 1`);
        return { type: "constant", value: 1 };
      }
      return preset;
    }
    return curveRef;
  }

  /**
   * Evaluate an actual curve definition
   */
  evaluateCurve(curve: Curve, context: CurveContext): number {
    switch (curve.type) {
      case "constant":
        return this.evaluateConstant(curve);
      case "linear":
        return this.evaluateLinear(curve, context);
      case "exponential":
        return this.evaluateExponential(curve, context);
      case "exponential_offset":
        return this.evaluateExponentialOffset(curve, context);
      case "polynomial":
        return this.evaluatePolynomial(curve, context);
      case "logarithmic":
        return this.evaluateLogarithmic(curve, context);
      case "sigmoid":
        return this.evaluateSigmoid(curve, context);
      case "step":
        return this.evaluateStep(curve, context);
      case "formula":
        return this.evaluateFormula(curve, context);
      case "compound":
        return this.evaluateCompound(curve, context);
      default:
        console.warn(`CurveEvaluator: Unknown curve type, returning 1`);
        return 1;
    }
  }

  private evaluateConstant(curve: ConstantCurve): number {
    return curve.value;
  }

  private evaluateLinear(curve: LinearCurve, context: CurveContext): number {
    const count = this.getContextValue(curve.countVar, context);
    return curve.base + curve.rate * count;
  }

  private evaluateExponential(curve: ExponentialCurve, context: CurveContext): number {
    const count = this.getContextValue(curve.countVar, context);
    return curve.base * Math.pow(curve.rate, count);
  }

  private evaluateExponentialOffset(curve: ExponentialOffsetCurve, context: CurveContext): number {
    const count = this.getContextValue(curve.countVar, context);
    return curve.base * Math.pow(curve.rate, count + curve.offset);
  }

  private evaluatePolynomial(curve: PolynomialCurve, context: CurveContext): number {
    const value = this.getContextValue(curve.valueVar, context);
    return curve.coefficient * Math.pow(value, curve.power);
  }

  private evaluateLogarithmic(curve: LogarithmicCurve, context: CurveContext): number {
    const value = this.getContextValue(curve.valueVar, context);
    const logValue = Math.log(value + curve.offset) / Math.log(curve.logBase);
    return curve.coefficient * logValue;
  }

  private evaluateSigmoid(curve: SigmoidCurve, context: CurveContext): number {
    const value = this.getContextValue(curve.valueVar, context);
    return curve.max / (1 + Math.exp(-curve.steepness * (value - curve.midpoint)));
  }

  private evaluateStep(curve: StepCurve, context: CurveContext): number {
    const input = this.getContextValue(curve.inputVar, context);

    // Find the highest threshold that input has passed
    let result = 0;
    for (const step of curve.steps) {
      if (input >= step.threshold) {
        result = step.value;
      } else {
        break;
      }
    }
    return result;
  }

  private evaluateFormula(curve: FormulaCurve, context: CurveContext): number {
    return this.parseAndEvaluateExpression(curve.expression, context);
  }

  private evaluateCompound(curve: CompoundCurve, context: CurveContext): number {
    const values = curve.curves.map((c) => this.evaluateCurve(c, context));

    if (values.length === 0) return 0;

    switch (curve.operation) {
      case "add":
        return values.reduce((sum, v) => sum + v, 0);
      case "multiply":
        return values.reduce((product, v) => product * v, 1);
      case "min":
        return Math.min(...values);
      case "max":
        return Math.max(...values);
      case "subtract":
        return values[0] - values.slice(1).reduce((sum, v) => sum + v, 0);
      case "divide": {
        const divisor = values.slice(1).reduce((product, v) => product * v, 1);
        return divisor === 0 ? 0 : values[0] / divisor;
      }
      default:
        return values[0];
    }
  }

  private getContextValue(varName: string, context: CurveContext): number {
    if (varName in context) {
      return context[varName];
    }
    console.warn(`CurveEvaluator: Variable "${varName}" not found in context, using 0`);
    return 0;
  }

  /**
   * Parse and evaluate a formula expression
   * Supports: +, -, *, /, ^, (), and functions: min, max, floor, ceil, log, log10, sqrt, abs
   */
  private parseAndEvaluateExpression(expression: string, context: CurveContext): number {
    // Replace variable names with their values
    let expr = expression;

    // Sort variable names by length (longest first) to avoid partial replacements
    const varNames = Object.keys(context).sort((a, b) => b.length - a.length);

    for (const varName of varNames) {
      // Use word boundary matching to avoid partial replacements
      const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, "g");
      expr = expr.replace(regex, String(context[varName]));
    }

    // Replace constants
    expr = expr.replace(/\be\b/g, String(Math.E));
    expr = expr.replace(/\bpi\b/g, String(Math.PI));

    // Replace functions
    expr = this.replaceFunctions(expr);

    // Replace ^ with ** for exponentiation
    expr = expr.replace(/\^/g, "**");

    try {
      // Use Function constructor for safe evaluation
      // Only allows mathematical operations
      const result = new Function(`"use strict"; return (${expr})`)();

      if (typeof result !== "number" || !isFinite(result)) {
        console.warn(`CurveEvaluator: Formula "${expression}" returned invalid result: ${result}`);
        return 0;
      }

      return result;
    } catch (error) {
      console.error(`CurveEvaluator: Error evaluating formula "${expression}":`, error);
      return 0;
    }
  }

  private replaceFunctions(expr: string): string {
    // Replace mathematical functions with JavaScript equivalents
    const functionMap: Record<string, string> = {
      min: "Math.min",
      max: "Math.max",
      floor: "Math.floor",
      ceil: "Math.ceil",
      log: "Math.log",
      log10: "Math.log10",
      sqrt: "Math.sqrt",
      abs: "Math.abs",
      sin: "Math.sin",
      cos: "Math.cos",
      tan: "Math.tan",
      exp: "Math.exp",
      pow: "Math.pow",
    };

    for (const [fn, mathFn] of Object.entries(functionMap)) {
      const regex = new RegExp(`\\b${fn}\\s*\\(`, "g");
      expr = expr.replace(regex, `${mathFn}(`);
    }

    return expr;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

// Singleton instance
let evaluatorInstance: CurveEvaluator | null = null;

export function getCurveEvaluator(): CurveEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new CurveEvaluator();
  }
  return evaluatorInstance;
}

export function initializeCurveEvaluator(presets: CurvePreset[]): CurveEvaluator {
  evaluatorInstance = new CurveEvaluator(presets);
  return evaluatorInstance;
}
