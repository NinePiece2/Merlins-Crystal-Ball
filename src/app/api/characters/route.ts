import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { character, characterLevel, campaignParty } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

/**
 * GET /api/characters
 * Get all characters for the authenticated user
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userCharacters = await db
      .select()
      .from(character)
      .where(eq(character.userId, session.user.id));

    // Fetch levels for each character
    const charactersWithLevels = await Promise.all(
      userCharacters.map(async (char) => {
        const levels = await db
          .select()
          .from(characterLevel)
          .where(eq(characterLevel.characterId, char.id));
        return { ...char, levels };
      }),
    );

    return NextResponse.json(charactersWithLevels);
  } catch (error: unknown) {
    console.error("Error fetching characters:", error);
    return NextResponse.json({ error: "Failed to fetch characters" }, { status: 500 });
  }
}

/**
 * POST /api/characters
 * Create a new character
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    // Extract form data
    const name = formData.get("name") as string;
    const campaignId = formData.get("campaignId") as string;
    const profileImage = formData.get("profileImage") as File | null;

    // Validate required fields with Zod
    const createCharSchema = z.object({
      name: z
        .string()
        .min(1, "Character name is required")
        .min(2, "Character name must be at least 2 characters"),
      campaignId: z.string().min(1, "Campaign is required"),
    });

    const validatedInput = createCharSchema.parse({
      name,
      campaignId,
    });

    // Validate that the campaign exists and belongs to the user
    const campaignResult = await db.query.campaign.findFirst({
      where: (c, { eq, and }) => and(eq(c.id, campaignId), eq(c.userId, session.user.id)),
    });

    if (!campaignResult) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Handle profile image if provided
    let profileImageDataUrl: string | null = null;
    if (profileImage) {
      const buffer = await profileImage.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      profileImageDataUrl = `data:${profileImage.type};base64,${base64}`;
    }

    // Create the character
    const newCharacterId = nanoid();
    const newCharacter = {
      id: newCharacterId,
      userId: session.user.id,
      name: validatedInput.name,
      race: null,
      class: null,
      background: null,
      profileImage: profileImageDataUrl,
      notes: null,
    };

    await db.insert(character).values(newCharacter);

    // Add character to campaign party
    await db.insert(campaignParty).values({
      campaignId: campaignId,
      characterId: newCharacterId,
    });

    return NextResponse.json(newCharacter, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating character:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid character data",
          details: error.issues,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  }
}
