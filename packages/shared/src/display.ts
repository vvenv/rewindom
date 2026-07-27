/**
 * UI placeholder when a scalar field has no value (em dash, U+2014).
 */
export const EMPTY_DISPLAY = "—";

/**
 * Display a value or return an empty placeholder if the value is null, undefined, or empty string.
 * @param value - The value to display
 * @returns The trimmed value or EMPTY_DISPLAY placeholder
 */
export function displayOrEmpty(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return EMPTY_DISPLAY;
  if (typeof value === "string") return value.trim() || EMPTY_DISPLAY;
  return value.toString();
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "500ms", "1.5s", "2m 30s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}
