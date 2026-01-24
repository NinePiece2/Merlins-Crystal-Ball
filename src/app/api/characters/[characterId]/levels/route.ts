import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { character, characterLevel } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadCharacterSheet, deleteFile } from "@/lib/minio";
import { parseCharacterSheetPDF, validateExtractedData, extractClassName } from "@/lib/pdf-parser";
import { nanoid } from "nanoid";

/**
 * Extract and populate character table info from extracted PDF data
 */
async function populateCharacterInfo(characterId: string, extractedData: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};

  // Extract race if available
  if (extractedData.race && typeof extractedData.race === "string") {
    updates.race = extractedData.race;
  }

  // Extract background if available
  if (extractedData.background && typeof extractedData.background === "string") {
    updates.background = extractedData.background;
  }

  // Extract class from classLevel (e.g., "Barbarian 3" -> "Barbarian")
  if (extractedData.classLevel && typeof extractedData.classLevel === "string") {
    const className = extractClassName(extractedData.classLevel);
    if (className) {
      updates.class = className;
    }
  }

  // Update character if we have any data to update
  if (Object.keys(updates).length > 0) {
    await db.update(character).set(updates).where(eq(character.id, characterId));
  }
}

/**
 * POST /api/characters/[characterId]/levels
 * Upload a character level (sheet PDF)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { characterId } = await params;

    // Verify character ownership
    const char = await db
      .select()
      .from(character)
      .where(and(eq(character.id, characterId), eq(character.userId, session.user.id)));

    if (!char || char.length === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const level = parseInt(formData.get("level") as string, 10);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (isNaN(level) || level < 1 || level > 20) {
      return NextResponse.json({ error: "Invalid level (must be 1-20)" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to MinIO
    const sheetUrl = await uploadCharacterSheet(
      session.user.id,
      characterId,
      level,
      buffer,
      file.name,
    );

    // Parse PDF to extract data
    let extractedData: Record<string, unknown> = {};
    try {
      if (file.type === "application/pdf") {
        extractedData = await parseCharacterSheetPDF(buffer);
        extractedData = validateExtractedData(extractedData);

        // Populate character table with race, class, background from extracted data
        await populateCharacterInfo(characterId, extractedData);
      }
    } catch (parseError) {
      console.warn("Warning: Could not parse PDF, continuing with empty data", parseError);
    }

    // Check if level already exists and delete it (overwrite)
    const existingLevel = await db
      .select()
      .from(characterLevel)
      .where(and(eq(characterLevel.characterId, characterId), eq(characterLevel.level, level)));

    if (existingLevel && existingLevel.length > 0) {
      // Delete the old file from MinIO before deleting the database record
      const oldSheetUrl = existingLevel[0].sheetUrl;
      if (oldSheetUrl) {
        try {
          await deleteFile(oldSheetUrl);
        } catch (deleteError) {
          console.warn("Warning: Could not delete old character sheet file:", deleteError);
          // Continue even if file deletion fails
        }
      }

      // Delete the old database record
      await db
        .delete(characterLevel)
        .where(and(eq(characterLevel.characterId, characterId), eq(characterLevel.level, level)));
    }

    // Create new character level entry
    const newLevel = {
      id: nanoid(),
      characterId,
      level,
      sheetUrl,
      extractedData: extractedData || null,
    };

    await db.insert(characterLevel).values(newLevel);

    return NextResponse.json(newLevel, { status: 201 });
  } catch (error) {
    console.error("Error uploading character level:", error);
    return NextResponse.json({ error: "Failed to upload character level" }, { status: 500 });
  }
}

/**
 * GET /api/characters/[characterId]/levels
 * Get all levels for a character
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { characterId } = await params;

    // Verify character ownership
    const char = await db
      .select()
      .from(character)
      .where(and(eq(character.id, characterId), eq(character.userId, session.user.id)));

    if (!char || char.length === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const levels = await db
      .select()
      .from(characterLevel)
      .where(eq(characterLevel.characterId, characterId));

    return NextResponse.json(levels);
  } catch (error) {
    console.error("Error fetching character levels:", error);
    return NextResponse.json({ error: "Failed to fetch character levels" }, { status: 500 });
  }
}
