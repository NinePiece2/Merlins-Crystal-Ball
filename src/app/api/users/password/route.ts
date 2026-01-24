import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/users/password
 * Change user password using Better Auth
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Use Better Auth's changePassword method
    try {
      const headersList = await request.headers;

      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: headersList,
      });

      // Update requiresPasswordChange flag to false after successful password change
      try {
        await db
          .update(user)
          .set({ requiresPasswordChange: false })
          .where(eq(user.id, session.user.id));
      } catch (dbError) {
        console.error("Failed to update requiresPasswordChange flag:", dbError);
        // Continue anyway - password was changed successfully
      }

      return NextResponse.json({ success: true });
    } catch (authError: unknown) {
      console.error("Better Auth password change error:", authError);
      return NextResponse.json(
        { error: "Invalid current password or password change failed" },
        { status: 400 },
      );
    }
  } catch (error: unknown) {
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}

/**
 * POST /api/users/password
 * Alias for PATCH - also change user password
 */
export async function POST(request: NextRequest) {
  return PATCH(request);
}
