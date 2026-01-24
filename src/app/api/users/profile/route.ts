import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/users/profile
 * Update user profile (name, email, and/or image)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if this is FormData (for image upload) or JSON
    const contentType = request.headers.get("content-type");
    const updateData: Record<string, string | Date> = {};

    if (contentType?.includes("multipart/form-data")) {
      // Handle image upload
      const formData = await request.formData();
      const imageFile = formData.get("image") as File;

      if (imageFile) {
        // Convert image to base64 data URL
        const buffer = await imageFile.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const dataUrl = `data:${imageFile.type};base64,${base64}`;
        updateData.image = dataUrl;
      }
    } else {
      // Handle JSON data (name, email)
      const body = await request.json();
      const { name, email } = body;

      if (!name && !email) {
        return NextResponse.json({ error: "At least one field must be provided" }, { status: 400 });
      }

      if (name) updateData.name = name;
      if (email) updateData.email = email;
    }

    updateData.updatedAt = new Date();

    await db.update(user).set(updateData).where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
