/**
 * Shared spell utilities (no database access)
 */

/**
 * Normalize a spell name to match the ID format (lowercase with underscores)
 * - Removes any [...] entries
 * - Removes spaces
 * - Converts to lowercase with underscores
 * e.g., "Acid Arrow [UA]" -> "acid_arrow"
 * e.g., "Magic Missile" -> "magic_missile"
 */
export function normalizeSpellName(name: string): string {
  return name
    .replace(/\s*\[[^\]]*\]\s*/g, "") // Remove [anything] patterns and surrounding spaces
    .replace(/\s+/g, "_") // Replace remaining spaces with underscores
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ""); // Remove any other special characters
}
