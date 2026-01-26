import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { document, user } from "@/lib/db/schema";
import { uploadDocument, uploadChunk, downloadChunk, listChunks, deleteChunks } from "@/lib/minio";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

// Increase timeout for large uploads
export const maxDuration = 300; // 5 minutes

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
      // Save chunk to MinIO
      const buffer = Buffer.from(await file.arrayBuffer());
      const chunkName = `${uploadId}/chunk-${chunkIndex}`;

      try {
        await uploadChunk(chunkName, buffer);
      } catch (uploadError) {
        console.error(`Upload ${uploadId}: Failed to upload chunk ${chunkIndex}:`, uploadError);
        return NextResponse.json({ error: "Failed to upload chunk" }, { status: 500 });
      }

      // Check if all chunks are received
      try {
        const chunks = await listChunks(uploadId);
        const total = parseInt(totalChunks);

        if (chunks.length === total) {
          // All chunks received, reassemble file
          try {
            // Sort chunks numerically to ensure correct order
            const sortedChunkNames = chunks
              .map((name) => ({
                index: parseInt(name.split("-")[1]),
                name,
              }))
              .sort((a, b) => a.index - b.index)
              .map((c) => c.name);

            // Download and concatenate chunks sequentially to manage memory
            const sortedChunks: Buffer[] = [];
            for (const chunkName of sortedChunkNames) {
              const chunkBuffer = await downloadChunk(`${uploadId}/${chunkName}`);
              sortedChunks.push(chunkBuffer);
            }

            const completeBuffer = Buffer.concat(sortedChunks);

            // Validate complete file size
            const fileSizeMB = completeBuffer.length / (1024 * 1024);
            if (fileSizeMB > MAX_FILE_SIZE_MB) {
              // Clean up chunks
              await deleteChunks(uploadId);
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

            // Clean up temp chunks
            await deleteChunks(uploadId);

            console.log(
              `Upload ${uploadId}: Successfully uploaded ${fileSizeMB.toFixed(2)}MB file`,
            );
            return NextResponse.json(newDocument, { status: 201 });
          } catch (assemblyError) {
            console.error(
              `Upload ${uploadId}: Error during chunk reassembly/upload:`,
              assemblyError,
            );
            // Clean up on failure
            try {
              await deleteChunks(uploadId);
            } catch {
              // Ignore cleanup errors
            }
            throw assemblyError;
          }
        } else {
          // Chunks still being received
          console.log(
            `Upload ${uploadId}: Received chunk ${parseInt(chunkIndex) + 1}/${total}, total chunks in dir: ${chunks.length}`,
          );
          return NextResponse.json(
            { message: `Chunk ${parseInt(chunkIndex) + 1}/${total} received` },
            { status: 202 },
          );
        }
      } catch (listError) {
        console.error(`Upload ${uploadId}: Failed to list chunks:`, listError);
        return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
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
