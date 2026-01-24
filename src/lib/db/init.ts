import * as dotenv from "dotenv";
import { db } from "./index";
import { dndData } from "./schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

/**
 * Initialize the 5e_data table and populate it with spells data
 */
export async function initializeDatabase() {
  try {
    console.log("Initializing 5e_data table...");

    // Check if the spells entry already exists
    const existingSpells = await db
      .select()
      .from(dndData)
      .where(eq(dndData.key, "spells"))
      .limit(1);

    if (existingSpells.length > 0) {
      console.log("Spells data already exists in database, skipping initialization");
      return;
    }

    // Load spells from JSON file
    const spellsPath = path.join(process.cwd(), "data", "spells.json");
    console.log(`Looking for spells file at: ${spellsPath}`);

    if (!fs.existsSync(spellsPath)) {
      console.warn(`Spells file not found at ${spellsPath}, skipping spells initialization`);
      return;
    }

    console.log("Spells file found, reading...");
    const spellsData = JSON.parse(fs.readFileSync(spellsPath, "utf-8"));
    console.log(`Loaded ${Object.keys(spellsData).length} spell entries`);

    // Insert spells data
    console.log("Inserting spells data into database...");
    await db.insert(dndData).values({
      key: "spells",
      value: spellsData,
    });

    console.log("Successfully initialized 5e_data table with spells data");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Run initialization if this file is executed directly
// This works for both TypeScript (via tsx) and compiled JavaScript
const isMainModule =
  require.main === module ||
  (typeof import.meta !== "undefined" && import.meta.url === `file://${process.argv[1]}`);

if (isMainModule) {
  initializeDatabase()
    .then(() => {
      console.log("Database initialization completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database initialization failed:", error);
      process.exit(1);
    });
}
