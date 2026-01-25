import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { document, user } from "@/lib/db/schema";
import { deleteDocument } from "@/lib/minio";
import { eq } from "drizzle-orm";

/**
 * GET /api/documents/[documentId]
 * Get a specific document
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;

    const doc = await db.select().from(document).where(eq(document.id, documentId));

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(doc[0]);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/[documentId]
 * Delete a document (admin only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userRecord = await db.select().from(user).where(eq(user.id, session.user.id));

    if (!userRecord || userRecord.length === 0 || !userRecord[0].isAdmin) {
      return NextResponse.json({ error: "Only admins can delete documents" }, { status: 403 });
    }

    const { documentId } = await params;

    // Get the document
    const doc = await db.select().from(document).where(eq(document.id, documentId));

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete from MinIO
    await deleteDocument(doc[0].pdfUrl);

    // Delete from database
    await db.delete(document).where(eq(document.id, documentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
