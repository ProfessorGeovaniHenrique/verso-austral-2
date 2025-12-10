/**
 * Safe math utilities for division and percentage calculations
 * Prevents NaN and division by zero errors
 */

/**
 * Calculates percentage safely, returning formatted string
 * @param part - Numerator value
 * @param total - Denominator value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "45.2")
 */
export const safePercentage = (part: number, total: number, decimals = 1): string => {
  if (total === 0 || !Number.isFinite(part) || !Number.isFinite(total)) {
    return '0.' + '0'.repeat(decimals);
  }
  return ((part / total) * 100).toFixed(decimals);
};

/**
 * Divides two numbers safely, returning fallback on error
 * @param numerator - Numerator value
 * @param denominator - Denominator value
 * @param fallback - Value to return if division is invalid (default: 0)
 * @returns Result of division or fallback
 */
export const safeDivide = (numerator: number, denominator: number, fallback = 0): number => {
  if (denominator === 0 || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return fallback;
  }
  return numerator / denominator;
};

/**
 * Calculates percentage as a number safely
 * @param part - Numerator value
 * @param total - Denominator value
 * @param fallback - Value to return if calculation is invalid (default: 0)
 * @returns Percentage value (0-100) or fallback
 */
export const safePercentageNumber = (part: number, total: number, fallback = 0): number => {
  if (total === 0 || !Number.isFinite(part) || !Number.isFinite(total)) {
    return fallback;
  }
  return (part / total) * 100;
};
