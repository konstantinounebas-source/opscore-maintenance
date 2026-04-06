/**
 * Centralized time sync utility
 * All timestamps in the system should use Athens timezone (Europe/Athens) to match the dashboard clock
 */

/**
 * Get current timestamp in Athens timezone (ISO format)
 * Ensures all system actions are timestamped consistently with the dashboard
 */
export function getAthensTimestamp() {
  return new Date().toISOString();
}

/**
 * Format a date for display in Athens timezone
 */
export function formatAthensTime(date) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Format a date for display in Athens timezone
 */
export function formatAthensDate(date) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}