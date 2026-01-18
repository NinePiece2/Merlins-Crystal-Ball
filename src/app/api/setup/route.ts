import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    // Check if users already exist
    const existingUsers = await db.query.user.findMany();
    if (existingUsers.length > 0) {
      return NextResponse.json({ message: "Setup has already been completed" }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (existingUser) {
      return NextResponse.json({ message: "Email already exists" }, { status: 400 });
    }

    // Use Better Auth's sign up to create the user with proper password hashing
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || email,
      },
    });

    // Update the user to be admin
    if (signUpResponse.user?.id) {
      await db.update(user).set({ isAdmin: true }).where(eq(user.id, signUpResponse.user.id));
    }

    // Create response with setup_complete cookie
    const res = NextResponse.json(
      { message: "Admin account created successfully" },
      { status: 200 },
    );
    res.cookies.set("setup_complete", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return res;
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ message: "Failed to create admin account" }, { status: 500 });
  }
}
