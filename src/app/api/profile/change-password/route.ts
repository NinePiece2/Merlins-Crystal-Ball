import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { auth } from "@/lib/auth";

/**
 * POST /api/profile/change-password
 * Change the current user's password using Better Auth
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

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
    // Note: This would need to be added to the Better Auth API
    // For now, we'll use a simpler approach with auth.api methods
    try {
      // First, verify the current password by attempting to sign in
      // This is done server-side without exposing the password
      const headersList = await request.headers;

      // Better Auth provides a changePassword endpoint through its API
      // We can call it directly through the auth instance
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: headersList,
      });

      return NextResponse.json({ success: true });
    } catch (authError: unknown) {
      console.error("Better Auth password change error:", authError);
      return NextResponse.json(
        { error: "Invalid current password or password change failed" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
