import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/profile
 * Get the current user's profile
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await db.select().from(user).where(eq(user.id, session.user.id));

    if (!userProfile || userProfile.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(userProfile[0]);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

/**
 * PATCH /api/profile
 * Update the current user's profile (name, email, username)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email } = body;

    // Validate inputs
    if (name && typeof name !== "string") {
      return NextResponse.json({ error: "Name must be a string" }, { status: 400 });
    }

    if (email && typeof email !== "string") {
      return NextResponse.json({ error: "Email must be a string" }, { status: 400 });
    }

    // Check if email is already in use by another user
    if (email && email !== session.user.email) {
      const existingUser = await db.select().from(user).where(eq(user.email, email));

      if (existingUser && existingUser.length > 0) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
    }

    // Update using Better Auth's updateUser method
    const updateData: Record<string, string | Date> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    updateData.updatedAt = new Date();

    await db.update(user).set(updateData).where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
