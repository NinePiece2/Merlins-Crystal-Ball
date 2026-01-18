import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = await db.query.user.findMany();

    // Count total users
    const totalUsers = users.length;

    return NextResponse.json({
      needsSetup: totalUsers === 0,
    });
  } catch (error) {
    console.error("Setup status error:", error);
    return NextResponse.json({ error: "Failed to check setup status" }, { status: 500 });
  }
}
