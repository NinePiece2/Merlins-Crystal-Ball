import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { character, characterLevel } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { downloadFile } from "@/lib/minio";
import { PDFDocument } from "pdf-lib";

/**
 * GET /api/characters/[characterId]/levels/[level]/pdf
 * Proxy the character sheet PDF from MinIO storage
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

    // Verify character exists (characters are global)
    const char = await db
      .select({ id: character.id, name: character.name })
      .from(character)
      .where(eq(character.id, characterId));

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

    const sheetPath = charLevel[0].sheetUrl;
    if (!sheetPath) {
      return NextResponse.json({ error: "No PDF available for this level" }, { status: 404 });
    }

    // Download file from MinIO
    const fileBuffer = await downloadFile(sheetPath);

    // Create a clean filename format: "{Character Name} - Level {level}.pdf"
    const characterName = char[0].name;
    const cleanFileName = `${characterName} - Level ${levelNum}.pdf`;
    const pageTitle = cleanFileName.replace(".pdf", "");

    // Load the PDF and set its title metadata
    const pdfDoc = await PDFDocument.load(fileBuffer);
    pdfDoc.setTitle(pageTitle);

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // Return the PDF with proper headers
    const uint8Array = new Uint8Array(modifiedPdfBytes);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${cleanFileName}"`,
        "Content-Length": uint8Array.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching character level PDF:", error);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}
