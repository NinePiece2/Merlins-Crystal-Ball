import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userCampaignPreference, campaign } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/campaigns/[campaignId]/preference
 * Get the user's level preference for this campaign
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

    // Verify campaign exists (campaigns are global)
    const camp = await db.select().from(campaign).where(eq(campaign.id, campaignId));

    if (!camp || camp.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const preference = await db
      .select()
      .from(userCampaignPreference)
      .where(
        and(
          eq(userCampaignPreference.userId, session.user.id),
          eq(userCampaignPreference.campaignId, campaignId),
        ),
      );

    if (preference && preference.length > 0) {
      return NextResponse.json(preference[0]);
    }

    // Return default if not found
    return NextResponse.json({ selectedLevel: 1 });
  } catch (error) {
    console.error("Error fetching preference:", error);
    return NextResponse.json({ error: "Failed to fetch preference" }, { status: 500 });
  }
}

/**
 * PATCH /api/campaigns/[campaignId]/preference
 * Update the user's level preference for this campaign
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
    const { selectedLevel } = body;

    if (!selectedLevel || selectedLevel < 1 || selectedLevel > 20) {
      return NextResponse.json({ error: "Invalid level (must be 1-20)" }, { status: 400 });
    }

    // Verify campaign exists (campaigns are global)
    const camp = await db.select().from(campaign).where(eq(campaign.id, campaignId));

    if (!camp || camp.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Check if preference exists
    const existing = await db
      .select()
      .from(userCampaignPreference)
      .where(
        and(
          eq(userCampaignPreference.userId, session.user.id),
          eq(userCampaignPreference.campaignId, campaignId),
        ),
      );

    if (existing && existing.length > 0) {
      // Update existing
      await db
        .update(userCampaignPreference)
        .set({
          selectedLevel,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userCampaignPreference.userId, session.user.id),
            eq(userCampaignPreference.campaignId, campaignId),
          ),
        );
    } else {
      // Create new
      await db.insert(userCampaignPreference).values({
        userId: session.user.id,
        campaignId,
        selectedLevel,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, selectedLevel });
  } catch (error) {
    console.error("Error updating preference:", error);
    return NextResponse.json({ error: "Failed to update preference" }, { status: 500 });
  }
}
