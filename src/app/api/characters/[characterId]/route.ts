import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { character } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteCharacterFiles } from "@/lib/minio";

/**
 * GET /api/characters/[characterId]
 * Get a specific character
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
    const char = await db
      .select()
      .from(character)
      .where(and(eq(character.id, characterId), eq(character.userId, session.user.id)));

    if (!char || char.length === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    return NextResponse.json(char[0]);
  } catch (error) {
    console.error("Error fetching character:", error);
    return NextResponse.json({ error: "Failed to fetch character" }, { status: 500 });
  }
}

/**
 * PATCH /api/characters/[characterId]
 * Update a character
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { characterId } = await params;

    // Verify ownership
    const char = await db
      .select()
      .from(character)
      .where(and(eq(character.id, characterId), eq(character.userId, session.user.id)));

    if (!char || char.length === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Detect content-type and parse accordingly
    const contentType = request.headers.get("content-type");

    // Use Record with proper types instead of 'any'
    interface UpdateData {
      updatedAt: Date;
      name?: string;
      profileImage?: string;
      [key: string]: string | Date | undefined;
    }

    const updateData: UpdateData = { updatedAt: new Date() };

    if (contentType?.includes("multipart/form-data")) {
      // Handle FormData (image upload)
      const formData = await request.formData();

      const nameValue = formData.get("name");
      if (nameValue && typeof nameValue === "string") {
        updateData.name = nameValue;
      }

      const imageValue = formData.get("profileImage");
      if (imageValue instanceof File) {
        const buffer = await imageValue.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const dataUrl = `data:${imageValue.type};base64,${base64}`;
        updateData.profileImage = dataUrl;
      }
    } else {
      // Handle JSON
      const body = (await request.json()) as Record<string, unknown>;
      Object.assign(updateData, body);
    }

    // Update character with properly typed data
    const updateObject: Record<string, unknown> = {};
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateObject[key] = value;
      }
    });
    await db.update(character).set(updateObject).where(eq(character.id, characterId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating character:", error);
    return NextResponse.json({ error: "Failed to update character" }, { status: 500 });
  }
}

/**
 * DELETE /api/characters/[characterId]
 * Delete a character
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { characterId } = await params;

    // Verify ownership
    const char = await db
      .select()
      .from(character)
      .where(and(eq(character.id, characterId), eq(character.userId, session.user.id)));

    if (!char || char.length === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Delete all files from MinIO first
    await deleteCharacterFiles(session.user.id, characterId);

    // Delete character (cascade will delete levels)
    await db.delete(character).where(eq(character.id, characterId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting character:", error);
    return NextResponse.json({ error: "Failed to delete character" }, { status: 500 });
  }
}
