import { pgTable, text, timestamp, boolean, primaryKey, integer, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name"),
  image: text("image"),
  isAdmin: boolean("is_admin").notNull().default(false),
  requiresPasswordChange: boolean("requires_password_change").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable(
  "account",
  {
    id: text("id").unique(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.providerId] })],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// D&D Character Management Tables

export const character = pgTable("character", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  playerName: text("player_name"), // Player who controls this character
  race: text("race"), // Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
  class: text("class"), // Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard
  background: text("background"), // Soldier, Folk Hero, Sage, Charlatan, etc.
  profileImage: text("profile_image"), // Base64 data URL for character profile image
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const characterLevel = pgTable("character_level", {
  id: text("id").primaryKey(),
  characterId: text("character_id")
    .notNull()
    .references(() => character.id, { onDelete: "cascade" }),
  level: integer("level").notNull(), // Character level 1-20
  sheetUrl: text("sheet_url"), // URL to the uploaded PDF/image
  extractedData: jsonb("extracted_data").notNull().default({}), // All parsed data from the character sheet
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Index for faster queries of character levels by character
export const characterLevelUnique = pgTable(
  "character_level_unique",
  {
    characterId: text("character_id")
      .notNull()
      .references(() => character.id, { onDelete: "cascade" }),
    level: integer("level").notNull(),
  },
  (table) => [primaryKey({ columns: [table.characterId, table.level] })],
);

export const campaign = pgTable("campaign", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaignParty = pgTable(
  "campaign_party",
  {
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaign.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => character.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.campaignId, table.characterId] })],
);

// Persistent user preference for which level they're viewing in a campaign
export const userCampaignPreference = pgTable(
  "user_campaign_preference",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaign.id, { onDelete: "cascade" }),
    selectedLevel: integer("selected_level").notNull().default(1),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.campaignId] })],
);

// Zod Validation Schemas

export const CharacterSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(1, "Character name is required"),
  playerName: z.string().optional(),
  race: z.string().optional(),
  class: z.string().optional(),
  background: z.string().optional(),
  profileImage: z.string().optional(),
  notes: z.string().optional(),
});

export const CharacterLevelSchema = z.object({
  id: z.string().optional(),
  characterId: z.string(),
  level: z.number().min(1).max(20),
  sheetUrl: z.string().optional(),
  extractedData: z.record(z.string(), z.any()).optional(),
});

export const ExtractedCharacterDataSchema = z.object({
  classLevel: z.string().optional(), // e.g., "Barbarian 3"
  characterName: z.string().optional(), // Character name
  playerName: z.string().optional(), // Player name
  race: z.string().optional(), // Character race
  background: z.string().optional(), // Character background
  alignment: z.string().optional(), // Alignment
  maxHP: z.string().optional(), // Maximum hit points
  currentHP: z.string().optional(), // Current hit points
  temporaryHP: z.string().optional(), // Temporary hit points
  ac: z.string().optional(), // Armor Class
  armorDescription: z.string().optional(), // Armor and worn items
  initiative: z.string().optional(), // Initiative modifier
  speed: z.string().optional(), // Movement speed
  proficiencyBonus: z.string().optional(), // Proficiency bonus
  experiencePoints: z.string().optional(), // Experience points
  hitDice: z.string().optional(), // Hit dice (e.g., "3d12")
  passivePerception: z.string().optional(), // Passive Perception score
  // Saving throws with proficiency indicators
  savingThrows: z
    .object({
      strength: z.string().optional(),
      dexterity: z.string().optional(),
      constitution: z.string().optional(),
      intelligence: z.string().optional(),
      wisdom: z.string().optional(),
      charisma: z.string().optional(),
    })
    .optional(),
  // Ability scores
  abilityScores: z
    .object({
      strength: z.string().optional(),
      dexterity: z.string().optional(),
      constitution: z.string().optional(),
      intelligence: z.string().optional(),
      wisdom: z.string().optional(),
      charisma: z.string().optional(),
    })
    .optional(),
  // Skills with proficiency/expertise info
  skills: z.record(z.string(), z.string()).optional(),
  // Resistances, Immunities, Vulnerabilities
  damageResistances: z.array(z.string()).optional(),
  damageImmunities: z.array(z.string()).optional(),
  damageVulnerabilities: z.array(z.string()).optional(),
  conditionImmunities: z.array(z.string()).optional(),
  // Senses
  senses: z
    .object({
      darkvision: z.string().optional(),
      truesight: z.string().optional(),
      blindsight: z.string().optional(),
      tremorsense: z.string().optional(),
    })
    .optional(),
  // Languages
  languages: z.array(z.string()).optional(),
  // Features and traits
  classFeatures: z.array(z.string()).optional(),
  racialTraits: z.array(z.string()).optional(),
  feats: z.array(z.string()).optional(),
  // Spellcasting
  spellSlots: z
    .object({
      firstLevel: z.string().optional(),
      secondLevel: z.string().optional(),
      thirdLevel: z.string().optional(),
      fourthLevel: z.string().optional(),
      fifthLevel: z.string().optional(),
      sixthLevel: z.string().optional(),
      seventhLevel: z.string().optional(),
      eighthLevel: z.string().optional(),
      ninthLevel: z.string().optional(),
    })
    .optional(),
  cantrips: z.array(z.string()).optional(),
  spells: z.array(z.string()).optional(),
  spellBook: z
    .object({
      byLevel: z.record(z.string(), z.array(z.string())).optional(),
      cantrips: z.array(z.string()).optional(),
      rituals: z.array(z.string()).optional(),
      prepared: z.array(z.string()).optional(),
    })
    .optional(),
  spellcastingAbility: z.string().optional(), // INT, WIS, CHA, or STR
  weaponProficiencies: z.array(z.string()).optional(), // Simple, Martial, specific weapons
  armorProficiencies: z.array(z.string()).optional(), // Light, Medium, Heavy, Shields
  equipment: z.array(z.string()).optional(),
  defenses: z.string().optional(), // Resistances/Immunities/Vulnerabilities
  traits: z.array(z.string()).optional(), // Special traits/features
  personalityTraits: z.string().optional(),
  ideals: z.string().optional(),
  bonds: z.string().optional(),
  flaws: z.string().optional(),
  backstory: z.string().optional(), // Character backstory
  additionalNotesField: z.string().optional(), // Additional notes
  features: z.string().optional(), // Features & traits section
  additionalFeatures: z.string().optional(), // Additional features & traits
  alliesOrganizations: z.string().optional(), // Allies & organizations
});

export const CampaignSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
});

export const CreateCharacterSchema = z.object({
  name: z
    .string()
    .min(1, "Character name is required")
    .min(2, "Character name must be at least 2 characters"),
  profileImage: z.instanceof(File).optional(),
  campaignId: z.string().min(1, "Campaign is required"),
});

export const dndData = pgTable("5e_data", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Character = typeof character.$inferSelect;
export type CharacterLevel = typeof characterLevel.$inferSelect;
export type Campaign = typeof campaign.$inferSelect;
export type CampaignParty = typeof campaignParty.$inferSelect;
export type UserCampaignPreference = typeof userCampaignPreference.$inferSelect;
export type DndData = typeof dndData.$inferSelect;
