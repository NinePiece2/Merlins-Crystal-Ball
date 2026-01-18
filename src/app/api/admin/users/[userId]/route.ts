import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH - Update user (toggle admin status)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;

    // Check if user is admin
    const sessionResponse = await fetch(
      `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/session`,
      {
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
      },
    );

    if (!sessionResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await sessionResponse.json();
    if (!session.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { isAdmin } = await req.json();

    const updated = await db.update(user).set({ isAdmin }).where(eq(user.id, userId)).returning();

    return NextResponse.json({ user: updated[0] });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE - Remove a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;

    // Check if user is admin
    const sessionResponse = await fetch(
      `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/session`,
      {
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
      },
    );

    if (!sessionResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await sessionResponse.json();
    if (!session.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await db.delete(user).where(eq(user.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
