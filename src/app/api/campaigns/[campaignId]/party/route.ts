import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaign, campaignParty } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/campaigns/[campaignId]/party
 * Add a character to a campaign party
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;
    const body = await request.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json({ error: "Character ID required" }, { status: 400 });
    }

    // Verify campaign ownership
    const camp = await db
      .select()
      .from(campaign)
      .where(and(eq(campaign.id, campaignId), eq(campaign.userId, session.user.id)));

    if (!camp || camp.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Check if character is already in the party
    const existing = await db
      .select()
      .from(campaignParty)
      .where(
        and(eq(campaignParty.campaignId, campaignId), eq(campaignParty.characterId, characterId)),
      );

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Character already in this campaign" }, { status: 400 });
    }

    // Add to party
    const newPartyMember = {
      campaignId,
      characterId,
    };

    await db.insert(campaignParty).values(newPartyMember);

    return NextResponse.json(newPartyMember, { status: 201 });
  } catch (error) {
    console.error("Error adding character to campaign:", error);
    return NextResponse.json({ error: "Failed to add character to campaign" }, { status: 500 });
  }
}
