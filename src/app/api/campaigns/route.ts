import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaign, campaignParty, character } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CampaignSchema } from "@/lib/db/schema";
import { nanoid } from "nanoid";

/**
 * GET /api/campaigns
 * Get all campaigns (global across all users)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all campaigns (not filtered by userId - campaigns are global)
    const campaigns = await db.select().from(campaign);

    // Fetch party members for each campaign
    const campaignsWithParties = await Promise.all(
      campaigns.map(async (camp) => {
        const parties = await db
          .select()
          .from(campaignParty)
          .where(eq(campaignParty.campaignId, camp.id));

        // Fetch character details for each party member
        const partyDetails = await Promise.all(
          parties.map(async (p) => {
            const char = await db
              .select({
                id: character.id,
                name: character.name,
                profileImage: character.profileImage,
              })
              .from(character)
              .where(eq(character.id, p.characterId));
            return char[0] || { id: p.characterId, name: "Unknown", profileImage: null };
          }),
        );

        return {
          id: camp.id,
          name: camp.name,
          description: camp.description,
          party: partyDetails,
        };
      }),
    );

    return NextResponse.json(campaignsWithParties);
  } catch (error: unknown) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CampaignSchema.parse({
      ...body,
      userId: session.user.id,
    });

    const newCampaign = {
      id: nanoid(),
      ...validatedData,
    };

    await db.insert(campaign).values(newCampaign);

    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating campaign:", error);
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: unknown }).name === "ZodError"
    ) {
      return NextResponse.json(
        {
          error: "Invalid campaign data",
          details: (error as unknown as { errors: unknown }).errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
