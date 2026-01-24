import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { character, characterLevel } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteFile } from "@/lib/minio";

/**
 * GET /api/characters/[characterId]/levels/[level]
 * Get a specific character level's data (characters are global)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string; level: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { characterId, level } = await params;
    const levelNum = parseInt(level, 10);

    if (isNaN(levelNum) || levelNum < 1 || levelNum > 20) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    // Fetch character without userId filter - characters are global
    const char = await db.select().from(character).where(eq(character.id, characterId));

    if (!char || char.length === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Get the specific character level
    const charLevel = await db
      .select()
      .from(characterLevel)
      .where(and(eq(characterLevel.characterId, characterId), eq(characterLevel.level, levelNum)));

    if (!charLevel || charLevel.length === 0) {
      return NextResponse.json({ error: "Character level not found" }, { status: 404 });
    }

    // Return character data with level info
    const charData = char[0];
    return NextResponse.json({
      character: {
        characterName: charData.name,
        playerName: charData.name, // Can be extended if player name is tracked separately
        race: charData.race,
        class: charData.class,
        background: charData.background,
      },
      level: charLevel[0].level,
      extractedData: charLevel[0].extractedData || {},
    });
  } catch (error: unknown) {
    console.error("Error fetching character level:", error);
    return NextResponse.json({ error: "Failed to fetch character level" }, { status: 500 });
  }
}

/**
 * DELETE /api/characters/[characterId]/levels/[level]
 * Delete a specific character level
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string; level: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { characterId, level } = await params;
    const levelNum = parseInt(level, 10);

    if (isNaN(levelNum) || levelNum < 1 || levelNum > 20) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    // Verify character ownership
    const char = await db
      .select()
      .from(character)
      .where(and(eq(character.id, characterId), eq(character.userId, session.user.id)));

    if (!char || char.length === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Get the character level record to find the file path
    const charLevel = await db
      .select()
      .from(characterLevel)
      .where(and(eq(characterLevel.characterId, characterId), eq(characterLevel.level, levelNum)));

    if (!charLevel || charLevel.length === 0) {
      return NextResponse.json({ error: "Character level not found" }, { status: 404 });
    }

    // Delete file from MinIO if sheetUrl exists
    if (charLevel[0].sheetUrl) {
      try {
        await deleteFile(charLevel[0].sheetUrl);
      } catch (error) {
        console.error("Error deleting file from MinIO:", error);
        // Continue anyway - delete from DB even if file deletion fails
      }
    }

    // Delete the character level from database
    await db
      .delete(characterLevel)
      .where(and(eq(characterLevel.characterId, characterId), eq(characterLevel.level, levelNum)));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting character level:", error);
    return NextResponse.json({ error: "Failed to delete character level" }, { status: 500 });
  }
}
