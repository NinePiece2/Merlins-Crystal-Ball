import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { document, user } from "@/lib/db/schema";
import { uploadDocument } from "@/lib/minio";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const MAX_FILE_SIZE_MB = 5000; // 5GB max file size
const CHUNK_SIZE_MB = 100; // 100MB chunks for Cloudflare
const TEMP_DIR = path.join(process.cwd(), ".tmp-chunks");

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

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
    const uploadId = (formData.get("uploadId") as string) || nanoid();
    const chunkIndex = formData.get("chunkIndex") as string;
    const totalChunks = formData.get("totalChunks") as string;
    const fileType = (formData.get("fileType") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Validate file type (only on first chunk or non-chunked upload)
    const isChunkedUpload = chunkIndex !== null && totalChunks !== null;
    const shouldValidateType = !isChunkedUpload || (isChunkedUpload && chunkIndex === "0");

    if (shouldValidateType) {
      const typeToCheck = fileType || file.type;
      if (typeToCheck !== "application/pdf") {
        return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
      }
    }

    // Check file size for this chunk
    const chunkSizeMB = file.size / (1024 * 1024);
    if (chunkSizeMB > CHUNK_SIZE_MB + 1) {
      return NextResponse.json(
        { error: `Chunk size exceeds limit of ${CHUNK_SIZE_MB}MB` },
        { status: 400 },
      );
    }

    // Handle chunked upload
    if (chunkIndex !== null && totalChunks !== null) {
      const uploadDir = path.join(TEMP_DIR, uploadId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Save chunk
      const buffer = Buffer.from(await file.arrayBuffer());
      const chunkPath = path.join(uploadDir, `chunk-${chunkIndex}`);
      fs.writeFileSync(chunkPath, buffer);

      // Check if all chunks are received
      const chunks = fs.readdirSync(uploadDir);
      const total = parseInt(totalChunks);

      if (chunks.length === total) {
        // All chunks received, reassemble file
        const chunks_array = Array.from({ length: total }, (_, i) =>
          fs.readFileSync(path.join(uploadDir, `chunk-${i}`)),
        );
        const completeBuffer = Buffer.concat(chunks_array);

        // Validate complete file size
        const fileSizeMB = completeBuffer.length / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          // Clean up
          fs.rmSync(uploadDir, { recursive: true });
          return NextResponse.json(
            { error: `File size must be less than ${MAX_FILE_SIZE_MB}MB` },
            { status: 400 },
          );
        }

        // Upload to MinIO
        const pdfUrl = await uploadDocument(file.name, completeBuffer, completeBuffer.length);

        // Create database record
        const docId = nanoid();
        const newDocument = {
          id: docId,
          title,
          description,
          fileName: file.name,
          fileSize: completeBuffer.length,
          pdfUrl,
          uploadedBy: session.user.id,
        };

        await db.insert(document).values(newDocument);

        // Clean up temp files
        fs.rmSync(uploadDir, { recursive: true });

        return NextResponse.json(newDocument, { status: 201 });
      } else {
        // Chunks still being received
        return NextResponse.json(
          { message: `Chunk ${parseInt(chunkIndex) + 1}/${total} received` },
          { status: 202 },
        );
      }
    } else {
      // Single file upload (not chunked)
      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Check file size
      const fileSizeMB = buffer.length / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return NextResponse.json(
          { error: `File size must be less than ${MAX_FILE_SIZE_MB}MB` },
          { status: 400 },
        );
      }

      // Upload to MinIO
      const pdfUrl = await uploadDocument(file.name, buffer, buffer.length);

      // Create database record
      const docId = nanoid();
      const newDocument = {
        id: docId,
        title,
        description,
        fileName: file.name,
        fileSize: buffer.length,
        pdfUrl,
        uploadedBy: session.user.id,
      };

      await db.insert(document).values(newDocument);

      return NextResponse.json(newDocument, { status: 201 });
    }
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
