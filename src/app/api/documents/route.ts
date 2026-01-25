import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { document, user } from "@/lib/db/schema";
import { uploadDocument } from "@/lib/minio";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

const MAX_FILE_SIZE_MB = 5000; // 5GB max file size
const CHUNK_SIZE_MB = 100; // 100MB chunks for Cloudflare

/**
 * GET /api/documents
 * Get all documents available to users
 */
export async function GET() {
  try {
    const documents = await db.select().from(document).orderBy(document.createdAt);

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Upload a new document (admin only)
 * Supports large files via chunked uploads
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userRecord = await db.select().from(user).where(eq(user.id, session.user.id));

    if (!userRecord || userRecord.length === 0 || !userRecord[0].isAdmin) {
      return NextResponse.json({ error: "Only admins can upload documents" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE_MB}MB` },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to MinIO
    const pdfUrl = await uploadDocument(file.name, buffer, file.size);

    // Create database record
    const docId = nanoid();
    const newDocument = {
      id: docId,
      title,
      description,
      fileName: file.name,
      fileSize: file.size,
      pdfUrl,
      uploadedBy: session.user.id,
    };

    await db.insert(document).values(newDocument);

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
