"use server";

import { db } from "@/lib/db";
import { dndData } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeSpellName } from "@/lib/spell-utils";

export interface Spell {
  id: string;
  name: string;
  desc: string;
  higher_level?: string;
  range: string;
  components: string[];
  material?: string | null;
  ritual: boolean;
  duration: string;
  concentration: boolean;
  casting_time: string;
  level: number;
  school: string;
  class: string[];
}

let cachedSpells: Record<string, Spell> | null = null;

async function loadSpells(): Promise<Record<string, Spell>> {
  if (cachedSpells) {
    return cachedSpells;
  }

  const result = await db.select().from(dndData).where(eq(dndData.key, "spells")).limit(1);

  if (result.length === 0) {
    console.warn("Spells data not found in database");
    return {};
  }

  const spellsArray = result[0].value as Spell[];
  cachedSpells = {};

  // Index spells by their ID for quick lookup
  spellsArray.forEach((spell) => {
    cachedSpells![spell.id] = spell;
  });

  return cachedSpells;
}

/**
 * Search for a spell by name (server action)
 * First tries exact match, then falls back to partial matching
 */
export async function searchSpell(spellName: string): Promise<Spell | null> {
  const spells = await loadSpells();
  const normalizedName = normalizeSpellName(spellName);
  //   console.log(`[searchSpell] Input: "${spellName}" -> Normalized: "${normalizedName}"`);

  // Try exact match first
  let result = spells[normalizedName] || null;

  // If no exact match, try fuzzy search with partial matching
  if (!result) {
    // console.log(`[searchSpell] Exact match failed, trying fuzzy search...`);
    const fuzzyResults = await searchSpellsByName(spellName);
    if (fuzzyResults.length > 0) {
      result = fuzzyResults[0]; // Return the first (best) match
      //   console.log(`[searchSpell] Fuzzy match found: "${result.name}" (ID: ${result.id})`);
    }
  }

  return result;
}

/**
 * Search for spells by partial name match (server action)
 * Returns sorted results with best matches first
 */
export async function searchSpellsByName(query: string): Promise<Spell[]> {
  const spells = await loadSpells();
  const normalizedQuery = normalizeSpellName(query);

  // Extract key words from the query (ignoring possessives like "Melf's")
  const queryWords = query
    .toLowerCase()
    .split(/[\s']+/)
    .filter((word) => word.length > 2); // Filter out short words

  const results = Object.values(spells)
    .filter((spell) => {
      // Check if normalized ID contains normalized query
      if (spell.id.includes(normalizedQuery)) {
        return true;
      }

      // Check if spell name contains query words
      const spellNameLower = spell.name.toLowerCase();
      return queryWords.some((word) => spellNameLower.includes(word));
    })
    .sort((a, b) => {
      // Sort by relevance: exact name match first, then ID match, then word match
      const aNameMatch = a.name.toLowerCase() === query.toLowerCase();
      const bNameMatch = b.name.toLowerCase() === query.toLowerCase();

      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;

      const aIdMatch = a.id === normalizeSpellName(query);
      const bIdMatch = b.id === normalizeSpellName(query);

      if (aIdMatch && !bIdMatch) return -1;
      if (!aIdMatch && bIdMatch) return 1;

      // Otherwise sort by name
      return a.name.localeCompare(b.name);
    });

  return results;
}
