import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaign, campaignParty, character, characterLevel } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/campaigns/[campaignId]
 * Get a specific campaign with its party members and their data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;
    const camp = await db
      .select()
      .from(campaign)
      .where(and(eq(campaign.id, campaignId), eq(campaign.userId, session.user.id)));

    if (!camp || camp.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Fetch party members
    const parties = await db
      .select()
      .from(campaignParty)
      .where(eq(campaignParty.campaignId, campaignId));

    // Fetch character details and levels
    const partyWithDetails = await Promise.all(
      parties.map(async (party) => {
        const char = await db.select().from(character).where(eq(character.id, party.characterId));

        const levels = await db
          .select()
          .from(characterLevel)
          .where(eq(characterLevel.characterId, party.characterId));

        return {
          ...party,
          character: char[0] || null,
          levels: levels || [],
        };
      }),
    );

    return NextResponse.json({
      campaign: camp[0],
      party: partyWithDetails,
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

/**
 * PATCH /api/campaigns/[campaignId]
 * Update a campaign
 */
export async function PATCH(
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

    // Verify ownership
    const camp = await db
      .select()
      .from(campaign)
      .where(and(eq(campaign.id, campaignId), eq(campaign.userId, session.user.id)));

    if (!camp || camp.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Update campaign
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    await db.update(campaign).set(updateData).where(eq(campaign.id, campaignId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/[campaignId]
 * Delete a campaign
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;

    // Verify ownership
    const camp = await db
      .select()
      .from(campaign)
      .where(and(eq(campaign.id, campaignId), eq(campaign.userId, session.user.id)));

    if (!camp || camp.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Delete campaign (cascade will delete party entries)
    await db.delete(campaign).where(eq(campaign.id, campaignId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
