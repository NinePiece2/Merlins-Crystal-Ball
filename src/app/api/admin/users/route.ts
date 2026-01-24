import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
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
 * Validation schema for creating a user
 */
const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").optional(),
  isAdmin: z.boolean().optional().default(false),
});

// GET all users - admin only
export async function GET() {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const users = await db.query.user.findMany();

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST - Create a new user - admin only
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await req.json();

    // Validate request body
    const validatedData = createUserSchema.parse(body);

    // Use Better Auth to create the user
    const signUpResponse = await fetch(
      `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/sign-up/email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: validatedData.email,
          password: validatedData.password,
          name: validatedData.name || validatedData.email.split("@")[0],
        }),
      },
    );

    if (!signUpResponse.ok) {
      const data = await signUpResponse.json();
      return NextResponse.json({ error: data.message || "Failed to create user" }, { status: 400 });
    }

    // If isAdmin is true, update the user in the database
    if (validatedData.isAdmin) {
      try {
        // Get the created user from the response
        const userData = await signUpResponse.json();
        const userId = userData.user?.id;

        if (userId) {
          // Update the user's isAdmin status in the database
          await db.update(user).set({ isAdmin: true }).where(eq(user.id, userId));
        }
      } catch (err) {
        console.error("Failed to set admin status:", err);
        // Continue anyway - user was created successfully
      }
    }

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
