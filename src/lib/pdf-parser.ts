let pdfjsLib: typeof import("pdfjs-dist") | null = null;

// Polyfill DOMMatrix for Node.js environments (required by pdfjs-dist)
if (typeof process !== "undefined" && typeof global !== "undefined" && !global.DOMMatrix) {
  // Create a minimal DOMMatrix polyfill that satisfies the pdfjs-dist requirements
  const DOMMatrixPolyfill = class {
    constructor() {}
    multiply() {
      return new DOMMatrixPolyfill();
    }
    translate() {
      return new DOMMatrixPolyfill();
    }
    scale() {
      return new DOMMatrixPolyfill();
    }
    rotate() {
      return new DOMMatrixPolyfill();
    }
    skewX() {
      return new DOMMatrixPolyfill();
    }
    skewY() {
      return new DOMMatrixPolyfill();
    }
  };

  // Safely assign to global without strict type checking
  Object.defineProperty(global, "DOMMatrix", {
    value: DOMMatrixPolyfill,
    writable: true,
    configurable: true,
  });
}

// Lazy-load pdf.js to avoid issues in different environments
async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");

    // Set worker source based on environment
    let workerSrc: string = "";

    // Check if we're in Node.js ESM context (more reliable than window check)
    const isNodeJs = typeof process !== "undefined" && process.versions && process.versions.node;

    if (!isNodeJs) {
      // Browser: use CDN
      workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
    } else {
      // Node.js/Server: try to use require.resolve for local worker
      let foundWorker = false;
      try {
        if (typeof require !== "undefined" && typeof require.resolve === "function") {
          const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.mjs");
          workerSrc = `file://${workerPath.replace(/\\/g, "/")}`;
          foundWorker = true;
        }
      } catch {
        foundWorker = false;
      }

      // If require.resolve failed, construct path manually
      if (!foundWorker) {
        try {
          const path = await import("path");
          const workerPath = path.join(
            process.cwd(),
            "node_modules/pdfjs-dist/build/pdf.worker.mjs",
          );
          workerSrc = `file://${workerPath.replace(/\\/g, "/")}`;
        } catch {
          // Last resort: use data URL for synchronous processing
          workerSrc = "data:text/javascript,";
        }
      }
    }

    interface PDFJSLib {
      GlobalWorkerOptions: { workerSrc: string };
    }
    (pdfjsLib as unknown as PDFJSLib).GlobalWorkerOptions.workerSrc = workerSrc;
  }
  return pdfjsLib;
}

import { ExtractedCharacterDataSchema } from "./db/schema";

/**
 * Parse character sheet PDF and extract fillable form data
 * @param pdfBuffer - Buffer containing the PDF file
 * @returns Extracted character data
 */
export async function parseCharacterSheetPDF(pdfBuffer: Buffer): Promise<Record<string, unknown>> {
  try {
    const pdfjsModule = await getPdfjsLib();

    // Convert Buffer to Uint8Array for pdfjs-dist
    const uint8Array = new Uint8Array(pdfBuffer);

    const pdf = await pdfjsModule.getDocument({ data: uint8Array }).promise;
    const extractedData: Record<string, unknown> = {};

    // Process all pages to extract form fields
    const numPages = pdf.numPages;
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const annotations = await page.getAnnotations();

      // Extract form field values from annotations
      if (annotations) {
        for (const annotation of annotations) {
          if (annotation.subtype === "Widget" && annotation.fieldValue) {
            const fieldName = annotation.fieldName || annotation.T || "";
            const fieldValue = annotation.fieldValue || annotation.AS || "";

            // Store the raw value (later pages overwrite earlier pages for duplicate fields)
            extractedData[fieldName] = fieldValue;
          }
        }
      }
    }

    // Parse common D&D 5e field names
    const parsedData = parseFormFields(extractedData);
    return parsedData;
  } catch (error) {
    console.error("Error parsing character sheet PDF:", error);
    throw error;
  }
}

/**
 * Dev utility function to log all raw form field names from PDF
 */
export function logPDFFormFields(pdfBuffer: Buffer): Promise<void> {
  return getPdfjsLib().then(async (pdfjsModule) => {
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsModule.getDocument({ data: uint8Array }).promise;

    console.log("\n" + "=".repeat(80));
    console.log("All PDF Form Field Names and Values:");
    console.log("=".repeat(80));

    const fieldsMap = new Map<string, unknown>();

    // Collect from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const annotations = await page.getAnnotations();

      if (annotations) {
        for (const annotation of annotations) {
          if (annotation.subtype === "Widget") {
            const fieldName = annotation.fieldName || annotation.T || "";
            const fieldValue = annotation.fieldValue || annotation.AS || "";
            if (fieldName && fieldValue) {
              fieldsMap.set(fieldName, fieldValue);
            }
          }
        }
      }
    }

    Array.from(fieldsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([name, value]) => {
        const valueStr =
          typeof value === "string" && value.length > 100
            ? value.substring(0, 100) + "..."
            : String(value);
        console.log(`  "${name}" = "${valueStr}"`);
      });

    console.log("=".repeat(80) + "\n");
  });
}

/**
 * Parse form field values to extract D&D character data
 * Handles common character sheet field names
 */
function parseFormFields(formData: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Extract basic character information
  const characterInfo = {
    characterName: findFieldValue(formData, "CharacterName"),
    playerName: findFieldValue(formData, "PLAYER NAME"),
    race: findFieldValue(formData, "RACE"),
    background: findFieldValue(formData, "BACKGROUND"),
    alignment: findFieldValue(formData, "Alignment"),
  };

  for (const [key, value] of Object.entries(characterInfo)) {
    if (value) {
      result[key] = value;
    }
  }

  // Common D&D 5e form field names and their mappings
  const fieldMappings: Record<string, string[]> = {
    classLevel: ["CLASS  LEVEL", "CLASS LEVEL", "ClassLevel", "class_level", "CharacterClass"],
    maxHP: ["MaxHP", "Max HP", "HitPoints", "max_hp", "HP Max"],
    currentHP: ["CurrentHP", "Current HP", "current_hp", "HP Current"],
    temporaryHP: ["TempHP", "Temporary HP", "temporary_hp", "HP Temporary", "TemporaryHP"],
    ac: ["AC", "ArmorClass", "armor_class"],
    initiative: ["Init", "Initiative", "initiative"],
    speed: ["Speed", "speed", "Movement"],
    proficiencyBonus: ["ProfBonus", "Prof Bonus", "Proficiency Bonus", "prof_bonus"],
    experiencePoints: ["EXPERIENCE POINTS", "Experience Points", "XP"],
    passivePerception: [
      "Passive Perception",
      "PassivePerception",
      "passive_perception",
      "PassiveWisdom",
      "Passive1",
    ],
    hitDice: ["Total", "Hit Die", "HD"],
    armorDescription: ["Armor", "Worn Equipment"],
  };

  // Map form fields to standardized field names
  for (const [standardName, aliases] of Object.entries(fieldMappings)) {
    for (const alias of aliases) {
      const value = findFieldValue(formData, alias);
      if (value) {
        result[standardName] = value;
        break;
      }
    }
  }

  // If currentHP is not provided, default to maxHP (character at full health)
  if (result.maxHP && !result.currentHP) {
    result.currentHP = result.maxHP;
  }

  // Ability scores
  const abilityScoreMappings: Record<string, string[]> = {
    strength: ["STR", "Strength", "strength"],
    dexterity: ["DEX", "Dexterity", "dexterity"],
    constitution: ["CON", "Constitution", "constitution"],
    intelligence: ["INT", "Intelligence", "intelligence"],
    wisdom: ["WIS", "Wisdom", "wisdom"],
    charisma: ["CHA", "Charisma", "charisma"],
  };

  const abilityScores: Record<string, unknown> = {};
  for (const [abilityName, aliases] of Object.entries(abilityScoreMappings)) {
    for (const alias of aliases) {
      const value = findFieldValue(formData, alias);
      if (value) {
        abilityScores[abilityName] = value;
        break;
      }
    }
  }

  if (Object.keys(abilityScores).length > 0) {
    result.abilityScores = abilityScores;
  }

  // Saving throws (with proficiency indicators like "+5" or "+0")
  const savingThrows: Record<string, unknown> = {};
  const savingThrowAliases = {
    strength: ["ST Strength", "STR Save", "ST STR"],
    dexterity: ["ST Dexterity", "DEX Save", "ST DEX"],
    constitution: ["ST Constitution", "CON Save", "ST CON"],
    intelligence: ["ST Intelligence", "INT Save", "ST INT"],
    wisdom: ["ST Wisdom", "WIS Save", "ST WIS"],
    charisma: ["ST Charisma", "CHA Save", "ST CHA"],
  };

  for (const [ability, aliases] of Object.entries(savingThrowAliases)) {
    for (const alias of aliases) {
      const value = findFieldValue(formData, alias);
      if (value) {
        savingThrows[ability] = value;
        break;
      }
    }
  }

  if (Object.keys(savingThrows).length > 0) {
    result.savingThrows = savingThrows;
  }

  // Parse skills (D&D 5e standard skills)
  const skills: Record<string, unknown> = {};
  const skillNames = [
    "Acrobatics",
    "Animal",
    "Arcana",
    "Athletics",
    "Deception",
    "History",
    "Insight",
    "Intimidation",
    "Investigation",
    "Medicine",
    "Nature",
    "Perception",
    "Performance",
    "Persuasion",
    "Religion",
    "SleightofHand",
    "Stealth",
    "Survival",
  ];

  for (const skillName of skillNames) {
    const value = findFieldValue(formData, skillName);
    if (value) {
      skills[skillName] = value;
    }
  }

  if (Object.keys(skills).length > 0) {
    result.skills = skills;
  }

  // Extract damage resistances, immunities, vulnerabilities
  const damageResistances: string[] = [];
  const damageImmunities: string[] = [];
  const damageVulnerabilities: string[] = [];
  const conditionImmunities: string[] = [];

  // Parse defenses field which might contain resistances/immunities
  const defenses = findFieldValue(formData, "Defenses");
  if (defenses && typeof defenses === "string") {
    result.defenses = defenses;
    // Try to parse resistances from the defenses string
    if (defenses.toLowerCase().includes("resistance")) {
      const match = defenses.match(/Resistances?\s*-?\s*([^\n]+)/i);
      if (match) {
        damageResistances.push(...match[1].split(",").map((s) => s.trim()));
      }
    }
  }

  if (damageResistances.length > 0) result.damageResistances = damageResistances;
  if (damageImmunities.length > 0) result.damageImmunities = damageImmunities;
  if (damageVulnerabilities.length > 0) result.damageVulnerabilities = damageVulnerabilities;
  if (conditionImmunities.length > 0) result.conditionImmunities = conditionImmunities;

  // Extract senses (Darkvision, Blindsight, etc.)
  const senses: Record<string, unknown> = {};
  const senseFields = {
    darkvision: ["AdditionalSenses", "Darkvision", "Senses"],
    truesight: ["Truesight"],
    blindsight: ["Blindsight"],
    tremorsense: ["Tremorsense"],
  };

  for (const [sense, aliases] of Object.entries(senseFields)) {
    for (const alias of aliases) {
      const value = findFieldValue(formData, alias);
      if (value && typeof value === "string" && value.toLowerCase().includes(sense.toLowerCase())) {
        senses[sense] = value;
        break;
      }
    }
  }

  if (Object.keys(senses).length > 0) {
    result.senses = senses;
  }

  // Extract languages
  const languagesField = findFieldValue(formData, "ProficienciesLang");
  if (languagesField && typeof languagesField === "string") {
    const languagesMatch = languagesField.match(/LANGUAGES\s*\n([\s\S]*?)($|===)/i);
    if (languagesMatch) {
      const languages = languagesMatch[1]
        .split(",")
        .map((lang) => lang.trim())
        .filter((lang) => lang.length > 0);
      if (languages.length > 0) {
        result.languages = languages;
      }
    }
  }

  // Extract equipment/weapons
  const weaponNames = new Set<string>();

  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === "string" && key.includes("Wpn") && key.includes("Name") && value.trim()) {
      weaponNames.add(value.trim());
    }
  }

  if (weaponNames.size > 0) {
    result.equipment = Array.from(weaponNames);
  }

  // Extract class features, racial traits, and feats from Actions/Features section
  const classFeatures: string[] = [];
  const racialTraits: string[] = [];

  const actionsField = findFieldValue(formData, "Actions1");
  if (actionsField && typeof actionsField === "string") {
    result.classFeatures = [actionsField];
  }

  if (classFeatures.length > 0) result.classFeatures = classFeatures;
  if (racialTraits.length > 0) result.racialTraits = racialTraits;

  // Extract spells and cantrips
  const spells: string[] = [];
  const cantrips: string[] = [];

  // Look for fields named spellName0, spellName1, spellName2, etc.
  const spellNamePattern = /^spellName\d+$/i;
  for (const [key, value] of Object.entries(formData)) {
    if (spellNamePattern.test(key) && value && typeof value === "string") {
      const spellName = value.trim();
      if (spellName && !spells.includes(spellName)) {
        spells.push(spellName);
      }
    }
  }

  if (spells.length > 0) {
    result.spells = spells;
  }

  if (cantrips.length > 0) {
    result.cantrips = cantrips;
  }

  // Extract weapon proficiencies
  const weaponProfsField = findFieldValue(formData, "ProficienciesLang");
  if (weaponProfsField && typeof weaponProfsField === "string") {
    const weaponMatch = weaponProfsField.match(/WEAPONS\s*\n([\s\S]*?)($|===)/i);
    if (weaponMatch) {
      const profs = weaponMatch[1]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (profs.length > 0) {
        result.weaponProficiencies = profs;
      }
    }
  }

  // Extract armor proficiencies
  if (weaponProfsField && typeof weaponProfsField === "string") {
    const armorMatch = weaponProfsField.match(/ARMOR\s*\n([\s\S]*?)($|===)/i);
    if (armorMatch) {
      const profs = armorMatch[1]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (profs.length > 0) {
        result.armorProficiencies = profs;
      }
    }
  }

  // Determine spellcasting ability based on class (Barbarian doesn't cast)
  // This would be determined from the classLevel field
  const classLevelStr = String(result.classLevel || "");
  const spellcastingAbility = determineSpellcastingAbility(classLevelStr);
  if (spellcastingAbility) {
    result.spellcastingAbility = spellcastingAbility;
  }

  // Extract personality and background information
  const personalityFields: Record<string, string[]> = {
    personalityTraits: ["Personality Traits", "PersonalityTraits", "personality_traits"],
    ideals: ["Ideals", "ideals"],
    bonds: ["Bonds", "bonds"],
    flaws: ["Flaws", "flaws"],
    backstory: [
      "Character Backstory",
      "CharacterBackstory",
      "character_backstory",
      "Backstory",
      "backstory",
    ],
    additionalNotesField: [
      "ADDITIONAL NOTES",
      "Additional Notes",
      "AdditionalNotes",
      "AdditionalNotes1",
      "AdditionalNotes2",
      "additional_notes",
      "Notes",
      "notes",
    ],
  };

  for (const [fieldName, aliases] of Object.entries(personalityFields)) {
    // Special handling for additionalNotesField to combine AdditionalNotes1 and AdditionalNotes2
    if (fieldName === "additionalNotesField") {
      const notes: string[] = [];

      // Try to collect values from both AdditionalNotes1 and AdditionalNotes2
      const additionalNotes1 = findFieldValueExact(formData, "AdditionalNotes1");
      const additionalNotes2 = findFieldValueExact(formData, "AdditionalNotes2");

      if (additionalNotes1 && typeof additionalNotes1 === "string" && additionalNotes1.trim()) {
        notes.push(additionalNotes1.trim());
      }
      if (additionalNotes2 && typeof additionalNotes2 === "string" && additionalNotes2.trim()) {
        notes.push(additionalNotes2.trim());
      }

      // If we found either AdditionalNotes field, use those
      if (notes.length > 0) {
        result[fieldName] = notes.join("\n\n");
        continue;
      }

      // Otherwise try other aliases
      for (const alias of aliases) {
        if (alias === "AdditionalNotes1" || alias === "AdditionalNotes2") continue; // Skip, already handled
        const value = findFieldValueExact(formData, alias);
        if (value && typeof value === "string" && value.trim()) {
          result[fieldName] = value.trim();
          break;
        }
      }
    } else {
      // Standard extraction for other personality fields
      for (const alias of aliases) {
        const value = findFieldValueExact(formData, alias);
        if (value && typeof value === "string" && value.trim()) {
          result[fieldName] = value.trim();
          break;
        }
      }
    }
  }

  // Extract features and traits
  const featuresFields: Record<string, string[]> = {
    features: ["FEATURES  TRAITS", "Features Traits", "FeatureTraits", "features_traits"],
    additionalFeatures: [
      "ADDITIONAL FEATURES  TRAITS",
      "Additional Features Traits",
      "AdditionalFeatures",
      "additional_features_traits",
    ],
    alliesOrganizations: [
      "ALLIES  ORGANIZATIONS",
      "Allies Organizations",
      "AlliesOrganizations",
      "allies_organizations",
    ],
  };

  for (const [fieldName, aliases] of Object.entries(featuresFields)) {
    for (const alias of aliases) {
      const value = findFieldValue(formData, alias);
      if (value && typeof value === "string" && value.trim()) {
        result[fieldName] = value.trim();
        break;
      }
    }
  }

  return result;
}

/**
 * Extract class name and level from classLevel string (e.g., "Barbarian 3" -> "Barbarian")
 */
export function extractClassName(classLevel: string): string | null {
  if (!classLevel) return null;
  const match = classLevel.match(/([A-Za-z\s]+?)\s+(\d+)$/);
  return match ? match[1].trim() : null;
}

/**
 * Determine the primary spellcasting ability for a class
 */
function determineSpellcastingAbility(classLevel: string): string | null {
  const classMatch = classLevel.match(/([A-Za-z\s]+)\s+\d+/);
  if (!classMatch) return null;

  const className = classMatch[1].toLowerCase();

  const spellcasterMap: Record<string, string> = {
    bard: "CHA",
    cleric: "WIS",
    druid: "WIS",
    paladin: "CHA",
    ranger: "WIS",
    sorcerer: "CHA",
    warlock: "CHA",
    wizard: "INT",
    artificer: "INT",
    monk: "WIS", // Ki uses WIS
  };

  return spellcasterMap[className] || null;
}

/**
 * Find a field value by trying multiple aliases (case-insensitive and whitespace-tolerant)
 */
function findFieldValue(formData: Record<string, unknown>, fieldName: string): unknown {
  const lowerFieldName = fieldName.toLowerCase().trim();

  // First try exact case-insensitive match
  for (const [key, value] of Object.entries(formData)) {
    if (key.toLowerCase().trim() === lowerFieldName) {
      return value;
    }
  }

  // Try partial match for flexibility (e.g., "Animal" matches "Animal Handling")
  for (const [key, value] of Object.entries(formData)) {
    const lowerKey = key.toLowerCase().trim();
    if (lowerKey.includes(lowerFieldName) || lowerFieldName.includes(lowerKey)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Find a field value using exact matching only (case-insensitive)
 * Used for personality/backstory fields to avoid false matches
 */
function findFieldValueExact(formData: Record<string, unknown>, fieldName: string): unknown {
  const lowerFieldName = fieldName.toLowerCase().trim();

  for (const [key, value] of Object.entries(formData)) {
    if (key.toLowerCase().trim() === lowerFieldName) {
      return value;
    }
  }

  return undefined;
}

/**
 * Validate extracted data against the schema
 */
export function validateExtractedData(data: Record<string, unknown>): Record<string, unknown> {
  try {
    const validated = ExtractedCharacterDataSchema.parse(data);
    return validated;
  } catch (error) {
    console.warn("Data validation warning:", error);
    // Return raw data even if validation fails - parsing from PDFs can be lossy
    return data;
  }
}

export const pdfParser = {
  parseCharacterSheetPDF,
  validateExtractedData,
};
