/**
 * Number Formatting Configuration
 *
 * Controls how numbers are displayed throughout the game.
 * Adjust suffixes and thresholds for readability.
 */

import type { FormattingConfig } from "../types";

export const formattingConfig: FormattingConfig = {
  // ===========================================================================
  // SEPARATORS
  // ===========================================================================

  /** Separator for thousands (1,000) */
  thousandsSeparator: ",",

  /** Separator for decimals (1.5) */
  decimalSeparator: ".",

  // ===========================================================================
  // SUFFIX THRESHOLDS
  // ===========================================================================

  /**
   * Number abbreviation suffixes.
   * When a number exceeds 'min', divide by 'divisor' and append 'suffix'.
   * Order matters: checked from first to last, first match wins.
   */
  suffixes: [
    // Short scale (US/modern international)
    { min: 1e3, suffix: "K", divisor: 1e3 },      // Thousand
    { min: 1e6, suffix: "M", divisor: 1e6 },      // Million
    { min: 1e9, suffix: "B", divisor: 1e9 },      // Billion
    { min: 1e12, suffix: "T", divisor: 1e12 },    // Trillion
    { min: 1e15, suffix: "Qa", divisor: 1e15 },   // Quadrillion
    { min: 1e18, suffix: "Qi", divisor: 1e18 },   // Quintillion
    { min: 1e21, suffix: "Sx", divisor: 1e21 },   // Sextillion
    { min: 1e24, suffix: "Sp", divisor: 1e24 },   // Septillion
    { min: 1e27, suffix: "Oc", divisor: 1e27 },   // Octillion
    { min: 1e30, suffix: "No", divisor: 1e30 },   // Nonillion
    { min: 1e33, suffix: "Dc", divisor: 1e33 },   // Decillion
  ],

  // ===========================================================================
  // SCIENTIFIC NOTATION
  // ===========================================================================

  /**
   * Threshold at which numbers switch to scientific notation.
   * Should be higher than the last suffix threshold.
   */
  scientificThreshold: 1e36,

  /**
   * Decimal places shown in scientific notation.
   * e.g., 2 = "1.23e45"
   */
  scientificPrecision: 2,
};

// =============================================================================
// ALTERNATE SUFFIX SETS
// =============================================================================

/**
 * Vietnamese-themed suffixes (optional alternative)
 */
export const vietnameseSuffixes = [
  { min: 1e3, suffix: " nghìn", divisor: 1e3 },
  { min: 1e6, suffix: " triệu", divisor: 1e6 },
  { min: 1e9, suffix: " tỷ", divisor: 1e9 },
  { min: 1e12, suffix: " nghìn tỷ", divisor: 1e12 },
];

/**
 * Minimal suffixes (for compact displays)
 */
export const minimalSuffixes = [
  { min: 1e3, suffix: "k", divisor: 1e3 },
  { min: 1e6, suffix: "m", divisor: 1e6 },
  { min: 1e9, suffix: "b", divisor: 1e9 },
  { min: 1e12, suffix: "t", divisor: 1e12 },
];

// =============================================================================
// DISPLAY PRECISION RULES
// =============================================================================

export interface DisplayPrecisionConfig {
  /** Decimal places for values < 10 */
  smallValueDecimals: number;
  /** Decimal places for values 10-999 */
  mediumValueDecimals: number;
  /** Decimal places for values >= 1000 (before suffix) */
  largeValueDecimals: number;
  /** Decimal places when using suffixes */
  suffixedValueDecimals: number;
}

export const displayPrecision: DisplayPrecisionConfig = {
  smallValueDecimals: 2,    // 1.23
  mediumValueDecimals: 1,   // 12.3
  largeValueDecimals: 0,    // 1234
  suffixedValueDecimals: 2, // 1.23M
};

// =============================================================================
// RATE FORMATTING
// =============================================================================

export interface RateFormatConfig {
  /** Suffix for per-second rates */
  perSecondSuffix: string;
  /** Suffix for per-minute rates */
  perMinuteSuffix: string;
  /** Suffix for per-hour rates */
  perHourSuffix: string;
  /** Threshold to switch from /sec to /min */
  showPerMinuteBelow: number;
  /** Threshold to switch from /min to /hour */
  showPerHourBelow: number;
}

export const rateFormat: RateFormatConfig = {
  perSecondSuffix: "/sec",
  perMinuteSuffix: "/min",
  perHourSuffix: "/hr",
  showPerMinuteBelow: 0.1,  // Show /min if less than 0.1/sec
  showPerHourBelow: 0.01,   // Show /hr if less than 0.01/sec
};

// =============================================================================
// TIME FORMATTING
// =============================================================================

export interface TimeFormatConfig {
  /** Format for short durations (< 1 hour) */
  shortFormat: string;
  /** Format for medium durations (< 1 day) */
  mediumFormat: string;
  /** Format for long durations */
  longFormat: string;
}

export const timeFormat: TimeFormatConfig = {
  shortFormat: "mm:ss",       // 05:30
  mediumFormat: "HH:mm:ss",   // 02:05:30
  longFormat: "Dd HH:mm",     // 3d 02:05
};

export default formattingConfig;
