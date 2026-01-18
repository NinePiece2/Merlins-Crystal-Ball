import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all users - admin only
export async function GET(req: NextRequest) {
  try {
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

    const { email, name, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    // Use Better Auth to create the user
    const signUpResponse = await fetch(
      `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/sign-up/email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      },
    );

    if (!signUpResponse.ok) {
      const data = await signUpResponse.json();
      return NextResponse.json(
        { message: data.message || "Failed to create user" },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "User created successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ message: "Failed to create user" }, { status: 500 });
  }
}
