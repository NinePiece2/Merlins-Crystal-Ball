import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaign, campaignParty } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * DELETE /api/campaigns/[campaignId]/party/[characterId]
 * Remove a character from a campaign party
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string; characterId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId, characterId } = await params;

    // Verify campaign ownership
    const camp = await db
      .select()
      .from(campaign)
      .where(and(eq(campaign.id, campaignId), eq(campaign.userId, session.user.id)));

    if (!camp || camp.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Remove from party
    await db
      .delete(campaignParty)
      .where(
        and(eq(campaignParty.campaignId, campaignId), eq(campaignParty.characterId, characterId)),
      );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error removing character from campaign:", error);
    return NextResponse.json(
      { error: "Failed to remove character from campaign" },
      { status: 500 },
    );
  }
}
