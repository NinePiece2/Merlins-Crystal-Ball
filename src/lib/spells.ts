/**
 * Spell utilities - re-exports
 * - normalizeSpellName: client-safe utility
 * - Spell type: from server actions
 * - Database queries: use spells-server.ts directly
 */

export { normalizeSpellName } from "@/lib/spell-utils";
export type { Spell } from "@/lib/spells-server";
export { searchSpell, searchSpellsByName } from "@/lib/spells-server";
