import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

/**
 * Helper function to check if user is admin
 */
async function checkAdminAccess() {
  const session = await getSession();

  if (!session || !session.user) {
    return { isAdmin: false, error: "Unauthorized", status: 401 };
  }

  const isAdmin =
    session.user &&
    "isAdmin" in session.user &&
    (session.user as unknown as { isAdmin: boolean }).isAdmin;

  if (!isAdmin) {
    return { isAdmin: false, error: "Admin access required", status: 403 };
  }

  return { isAdmin: true, error: null, status: 200 };
}

/**
 * Validation schema for updating user
 */
const updateUserSchema = z.object({
  isAdmin: z.boolean("isAdmin must be a boolean"),
});

// PATCH - Update user (toggle admin status)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { userId } = await params;
    const body = await req.json();

    // Validate request body
    const validatedData = updateUserSchema.parse(body);

    const updated = await db
      .update(user)
      .set({ isAdmin: validatedData.isAdmin })
      .where(eq(user.id, userId))
      .returning();

    if (!updated[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updated[0] });
  } catch (error) {
    console.error("Failed to update user:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE - Remove a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { userId } = await params;

    // Check if this is the original admin user (first admin in database)
    const allUsers = await db.query.user.findMany();
    const firstAdmin = allUsers.find((u) => u.isAdmin);

    if (firstAdmin && firstAdmin.id === userId) {
      return NextResponse.json(
        { error: "Cannot delete the original admin account for security reasons" },
        { status: 403 },
      );
    }

    await db.delete(user).where(eq(user.id, userId));

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
