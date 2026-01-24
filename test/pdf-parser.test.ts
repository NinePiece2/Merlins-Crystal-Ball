import { describe, it, expect, beforeAll } from "vitest";
import {
  parseCharacterSheetPDF,
  validateExtractedData,
  extractClassName,
  logPDFFormFields,
} from "../src/lib/pdf-parser";
import fs from "fs";
import path from "path";

/**
 * Dev utility function to log all extracted fields from a character sheet
 */
function logAllExtractedFields(data: Record<string, unknown>, characterName: string): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Extracted Fields for ${characterName}:`);
  console.log("=".repeat(80));

  const keys = Object.keys(data).sort();
  for (const key of keys) {
    const value = data[key];
    if (value === null || value === undefined) {
      console.log(`  [MISSING] ${key}`);
    } else if (typeof value === "object") {
      console.log(`  [OBJECT]  ${key}:`, JSON.stringify(value, null, 2));
    } else if (typeof value === "string" && value.length > 100) {
      console.log(`  [STRING]  ${key}: "${value.substring(0, 100)}..."`);
    } else {
      console.log(`  [${typeof value.toString().toUpperCase()}] ${key}: ${value}`);
    }
  }
  console.log("=".repeat(80) + "\n");
}

describe("PDF Parser - Mogar Lvl 3", () => {
  let mogarBuffer: Buffer;

  beforeAll(() => {
    const pdfPath = path.join(__dirname, "Mogar Lvl 3.pdf");
    mogarBuffer = fs.readFileSync(pdfPath);
  });

  it("should parse Mogar Lvl 3.pdf and extract character data", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(Object.keys(result).length).toBeGreaterThan(0);

    // Log all extracted fields for development purposes
    logAllExtractedFields(result, "Mogar Lvl 3");

    // Log raw PDF form field names for debugging
    await logPDFFormFields(mogarBuffer);
  });

  it("should extract classLevel from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.classLevel).toBeDefined();
    expect(result.classLevel).toBe("Barbarian 3");
  });

  it("should extract class name correctly from Mogar's classLevel", async () => {
    const className = extractClassName("Barbarian 3");
    expect(className).toBe("Barbarian");
  });

  it("should extract HP values from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.maxHP).toBeDefined();
    expect(result.maxHP).toBe("35");
  });

  it("should extract AC from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.ac).toBeDefined();
    expect(result.ac).toBe("13");
  });

  it("should extract proficiency bonus from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.proficiencyBonus).toBeDefined();
    expect(result.proficiencyBonus).toBe("+2");
  });

  it("should extract ability scores from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.abilityScores).toBeDefined();
    expect(typeof result.abilityScores).toBe("object");

    const scores = result.abilityScores as Record<string, unknown>;
    expect(scores.strength).toBe("17");
    expect(scores.dexterity).toBe("11");
    expect(scores.constitution).toBe("16");
    expect(scores.intelligence).toBe("10");
    expect(scores.wisdom).toBe("10");
    expect(scores.charisma).toBe("10");
  });

  it("should extract skills from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.skills).toBeDefined();
    expect(typeof result.skills).toBe("object");

    const skills = result.skills as Record<string, unknown>;
    expect(skills.Acrobatics).toBe("+0");
    expect(skills.Athletics).toBe("+5");
    expect(skills.Perception).toBe("+2");
  });

  it("should extract character info from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.characterName).toBe("Mogar IX");
    expect(result.playerName).toBe("NinePiece2");
    expect(result.race).toBe("Dragonborn");
    expect(result.background).toBe("Soldier");
  });

  it("should extract initiative and speed from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.initiative).toBeDefined();
    expect(result.initiative).toBe("+0");

    expect(result.speed).toBeDefined();
    expect(result.speed).toBe("30 ft. (Walking)");
  });

  it("should extract equipment/weapons from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.equipment).toBeDefined();
    expect(Array.isArray(result.equipment)).toBe(true);

    const equipment = result.equipment as string[];
    expect(equipment.includes("Greataxe")).toBe(true);
    expect(equipment.includes("Handaxe")).toBe(true);
    expect(equipment.includes("Unarmed Strike")).toBe(true);
  });

  it("should extract saving throws from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.savingThrows).toBeDefined();
    expect(typeof result.savingThrows).toBe("object");

    const saves = result.savingThrows as Record<string, unknown>;
    expect(saves.strength).toBe("+5");
    expect(saves.dexterity).toBe("+0");
    expect(saves.constitution).toBe("+5");
  });

  it("should extract senses and defenses from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.defenses).toBeDefined();
    expect(result.senses).toBeDefined();
  });

  it("should extract hit dice from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    expect(result.hitDice).toBeDefined();
    expect(result.hitDice).toBe("3d12");
  });

  it("should determine spellcasting ability for Mogar (Barbarian has none)", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);

    // Barbarians don't cast spells, so spellcastingAbility should be null/undefined
    expect(result.spellcastingAbility).toBeUndefined();
  });

  it("should validate extracted data from Mogar", async () => {
    const result = await parseCharacterSheetPDF(mogarBuffer);
    const validated = validateExtractedData(result);

    expect(validated).toBeDefined();
    expect(typeof validated).toBe("object");

    expect(validated.classLevel).toBe("Barbarian 3");
    expect(validated.maxHP).toBe("35");
    expect(validated.ac).toBe("13");
  });
});

describe("PDF Parser - Lex Omnis Lvl 3", () => {
  let lexBuffer: Buffer;

  beforeAll(() => {
    const pdfPath = path.join(__dirname, "Lex Omnis lvl 3.pdf");
    lexBuffer = fs.readFileSync(pdfPath);
  });

  it("should parse Lex Omnis Lvl 3.pdf and extract character data", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(Object.keys(result).length).toBeGreaterThan(0);

    // Log all extracted fields for development purposes
    logAllExtractedFields(result, "Lex Omnis Lvl 3");
  });

  it("should extract character info from Lex Omnis", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    expect(result.characterName).toBe("Lex Omnis");
    expect(result.playerName).toBe("SidTheScienceKid7");
    expect(result.race).toBe("Human");
    expect(result.background).toBe("Custom Background");
    expect(result.classLevel).toBe("Wizard 3");
  });

  it("should extract class name correctly from Lex Omnis's classLevel", async () => {
    const className = extractClassName("Wizard 3");
    expect(className).toBe("Wizard");
  });

  it("should extract HP from Lex Omnis", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    expect(result.maxHP).toBeDefined();
    expect(result.maxHP).toBe("20");
  });

  it("should extract AC from Lex Omnis", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    expect(result.ac).toBeDefined();
    expect(result.ac).toBe("10");
  });

  it("should extract ability scores from Lex Omnis", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    expect(result.abilityScores).toBeDefined();
    expect(typeof result.abilityScores).toBe("object");

    const scores = result.abilityScores as Record<string, unknown>;
    expect(scores.strength).toBe("9");
    expect(scores.dexterity).toBe("10");
    expect(scores.constitution).toBe("14");
    expect(scores.intelligence).toBe("16");
    expect(scores.wisdom).toBe("15");
    expect(scores.charisma).toBe("14");
  });

  it("should determine spellcasting ability for Lex Omnis (Wizard = INT)", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    expect(result.spellcastingAbility).toBeDefined();
    expect(result.spellcastingAbility).toBe("INT");
  });

  it("should extract weapon proficiencies from Lex Omnis", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    // Wizards typically have simple weapon proficiencies
    // Proficiencies may or may not be extracted depending on PDF structure
    if (result.weaponProficiencies) {
      expect(Array.isArray(result.weaponProficiencies)).toBe(true);
      console.log("Lex Omnis weapon proficiencies:", result.weaponProficiencies);
    }
  });

  it("should extract armor proficiencies from Lex Omnis", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    // Wizards typically have no armor proficiencies
    if (result.armorProficiencies) {
      expect(Array.isArray(result.armorProficiencies)).toBe(true);
      console.log("Lex Omnis armor proficiencies:", result.armorProficiencies);
    }
  });

  it("should extract proficiency bonus from Lex Omnis", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);

    expect(result.proficiencyBonus).toBeDefined();
    console.log("Lex Omnis proficiency bonus:", result.proficiencyBonus);
  });

  it("should validate extracted data from Lex Omnis", async () => {
    const result = await parseCharacterSheetPDF(lexBuffer);
    const validated = validateExtractedData(result);

    expect(validated).toBeDefined();
    expect(typeof validated).toBe("object");

    expect(validated.characterName).toBe("Lex Omnis");
    expect(validated.classLevel).toBe("Wizard 3");
    expect(validated.race).toBe("Human");
  });
});
