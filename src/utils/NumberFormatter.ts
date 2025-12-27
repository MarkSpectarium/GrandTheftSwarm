/**
 * NumberFormatter - Human-readable number display
 *
 * Formats large numbers with suffixes, rates, and times.
 */

import type { FormattingConfig } from "../config/types";
import { formattingConfig, displayPrecision, rateFormat, timeFormat } from "../config/balance/formatting.config";

export class NumberFormatter {
  private config: FormattingConfig;

  constructor(config: FormattingConfig = formattingConfig) {
    this.config = config;
  }

  /**
   * Format a number with appropriate suffix/notation
   */
  format(value: number, decimals?: number): string {
    if (!isFinite(value)) return "∞";
    if (isNaN(value)) return "0";

    const absValue = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    // Very small numbers
    if (absValue < 0.01 && absValue > 0) {
      return sign + absValue.toExponential(2);
    }

    // Check for scientific notation threshold
    if (absValue >= this.config.scientificThreshold) {
      return sign + absValue.toExponential(this.config.scientificPrecision);
    }

    // Find appropriate suffix
    // Sort suffixes by min value descending to find the largest applicable
    const sortedSuffixes = [...this.config.suffixes].sort((a, b) => b.min - a.min);

    for (const suffix of sortedSuffixes) {
      if (absValue >= suffix.min) {
        const divided = absValue / suffix.divisor;
        const formattedNum = this.formatNumber(divided, decimals ?? displayPrecision.suffixedValueDecimals);
        return sign + formattedNum + suffix.suffix;
      }
    }

    // No suffix needed
    return sign + this.formatNumber(absValue, decimals ?? this.getDecimalsForValue(absValue));
  }

  /**
   * Format a number with thousand separators
   */
  formatNumber(value: number, decimals: number = 0): string {
    const fixed = value.toFixed(decimals);
    const parts = fixed.split(".");

    // Add thousand separators to integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.config.thousandsSeparator);

    return parts.join(this.config.decimalSeparator);
  }

  /**
   * Format as integer (no decimals)
   */
  formatInteger(value: number): string {
    return this.format(Math.floor(value), 0);
  }

  /**
   * Format a rate (per second/minute/hour)
   */
  formatRate(perSecond: number): string {
    if (perSecond === 0) return "0" + rateFormat.perSecondSuffix;

    const absRate = Math.abs(perSecond);
    const sign = perSecond < 0 ? "-" : "+";

    // Determine best unit
    if (absRate >= rateFormat.showPerMinuteBelow * 60) {
      // Show per second
      return sign + this.format(absRate) + rateFormat.perSecondSuffix;
    } else if (absRate * 60 >= rateFormat.showPerHourBelow * 60) {
      // Show per minute
      return sign + this.format(absRate * 60) + rateFormat.perMinuteSuffix;
    } else {
      // Show per hour
      return sign + this.format(absRate * 3600) + rateFormat.perHourSuffix;
    }
  }

  /**
   * Format time duration
   */
  formatTime(seconds: number): string {
    if (seconds < 0) return "0:00";
    if (!isFinite(seconds)) return "∞";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${this.pad(remainingHours)}:${this.pad(minutes)}`;
    } else if (hours > 0) {
      return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(secs)}`;
    } else {
      return `${this.pad(minutes)}:${this.pad(secs)}`;
    }
  }

  /**
   * Format time remaining with smart units
   */
  formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return "now";
    if (!isFinite(seconds)) return "never";

    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.ceil(seconds / 60);
      return `${mins}m`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  }

  /**
   * Format a percentage
   */
  formatPercent(value: number, decimals: number = 1): string {
    return (value * 100).toFixed(decimals) + "%";
  }

  /**
   * Format a multiplier (e.g., "2.5x" or "+150%")
   */
  formatMultiplier(value: number, asPercent: boolean = false): string {
    if (asPercent) {
      const percent = (value - 1) * 100;
      const sign = percent >= 0 ? "+" : "";
      return sign + percent.toFixed(1) + "%";
    }
    return value.toFixed(2) + "x";
  }

  /**
   * Format with sign (always show + or -)
   */
  formatWithSign(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return sign + this.format(value);
  }

  /**
   * Compact format for very small spaces
   */
  formatCompact(value: number): string {
    const absValue = Math.abs(value);

    if (absValue >= 1e12) {
      return (value / 1e12).toFixed(1) + "T";
    } else if (absValue >= 1e9) {
      return (value / 1e9).toFixed(1) + "B";
    } else if (absValue >= 1e6) {
      return (value / 1e6).toFixed(1) + "M";
    } else if (absValue >= 1e3) {
      return (value / 1e3).toFixed(1) + "K";
    }
    return value.toFixed(0);
  }

  private getDecimalsForValue(value: number): number {
    if (value < 10) return displayPrecision.smallValueDecimals;
    if (value < 1000) return displayPrecision.mediumValueDecimals;
    return displayPrecision.largeValueDecimals;
  }

  private pad(num: number): string {
    return num.toString().padStart(2, "0");
  }
}

// Singleton instance
let formatterInstance: NumberFormatter | null = null;

export function getFormatter(): NumberFormatter {
  if (!formatterInstance) {
    formatterInstance = new NumberFormatter();
  }
  return formatterInstance;
}

export function initializeFormatter(config: FormattingConfig): NumberFormatter {
  formatterInstance = new NumberFormatter(config);
  return formatterInstance;
}

// Convenience exports
export const formatNumber = (value: number, decimals?: number): string =>
  getFormatter().format(value, decimals);

export const formatRate = (perSecond: number): string =>
  getFormatter().formatRate(perSecond);

export const formatTime = (seconds: number): string =>
  getFormatter().formatTime(seconds);

export const formatPercent = (value: number): string =>
  getFormatter().formatPercent(value);
