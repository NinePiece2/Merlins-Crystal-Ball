import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { document } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import archiver from "archiver";
import { Readable } from "stream";
import minioClient from "@/lib/minio";

export const maxDuration = 300; // 5 minutes for large downloads

const BUCKET_NAME = process.env.MINIO_BUCKET || "character-sheets";

/**
 * Sanitize filename for HTTP headers - converts Unicode to ASCII-safe format
 */
function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
      .replace(/["\\]/g, "") // Remove quotes and backslashes
      .trim() || "document"
  );
}

/**
 * POST /api/documents/download-bulk
 * Stream multiple documents as a zip file (uncompressed for speed)
 * For single documents, streams directly without zipping
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentIds } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: "No document IDs provided" }, { status: 400 });
    }

    // Get the documents
    const docs = await db.select().from(document).where(inArray(document.id, documentIds));

    if (docs.length === 0) {
      return NextResponse.json({ error: "No documents found" }, { status: 404 });
    }

    // Optimization: If only one document, stream it directly without zipping
    if (docs.length === 1) {
      const doc = docs[0];
      try {
        // Get file size for Content-Length header (enables progress bars)
        const stat = await minioClient.statObject(BUCKET_NAME, doc.pdfUrl);
        const stream = await minioClient.getObject(BUCKET_NAME, doc.pdfUrl);
        const originalFilename = doc.title || doc.fileName;
        const safeFilename = sanitizeFilename(originalFilename);
        const encodedFilename = encodeURIComponent(originalFilename);

        // Convert Node stream to Web ReadableStream with larger chunks for throughput
        const webStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk: Buffer) => {
              controller.enqueue(new Uint8Array(chunk));
            });
            stream.on("end", () => {
              controller.close();
            });
            stream.on("error", (err: Error) => {
              controller.error(err);
            });
          },
        });

        return new NextResponse(webStream, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Length": stat.size.toString(),
            "Content-Disposition": `attachment; filename="${safeFilename}.pdf"; filename*=UTF-8''${encodedFilename}.pdf`,
            "Cache-Control": "no-cache",
          },
        });
      } catch (error) {
        console.error(`Error streaming document ${doc.id}:`, error);
        return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
      }
    }

    // Create a zip archive with NO compression (store mode) for maximum speed
    // Compression uses CPU heavily and adds little value for PDFs (already compressed)
    const archive = archiver("zip", {
      store: true, // Store mode - no compression, maximum speed
      highWaterMark: 1024 * 1024, // 1MB buffer for better throughput
    });

    // Track filenames to avoid duplicates
    const usedFilenames = new Set<string>();

    // Add each document to the archive
    for (const doc of docs) {
      try {
        // Get stream from MinIO
        const stream = await minioClient.getObject(BUCKET_NAME, doc.pdfUrl);

        // Create unique filename with safe characters only
        const baseName = sanitizeFilename(doc.title || doc.fileName.replace(".pdf", ""));
        let filename = `${baseName}.pdf`;
        let counter = 1;
        while (usedFilenames.has(filename)) {
          filename = `${baseName}_${counter}.pdf`;
          counter++;
        }
        usedFilenames.add(filename);

        // Append file to archive with streaming
        archive.append(stream as Readable, { name: filename });
      } catch (error) {
        console.error(`Error adding document ${doc.id} to archive:`, error);
        // Continue with other files even if one fails
      }
    }

    // Finalize the archive
    const finalizePromise = archive.finalize();

    // Handle any finalization errors
    finalizePromise.catch((error: unknown) => {
      console.error("Archive finalization error:", error);
    });

    // Convert archive stream to ReadableStream for NextResponse
    const readableStream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        archive.on("end", () => {
          controller.close();
        });
        archive.on("error", (error: unknown) => {
          console.error("Archive error:", error);
          controller.error(error);
        });
      },
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `documents_${timestamp}.zip`;

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error creating bulk download:", error);
    return NextResponse.json({ error: "Failed to create bulk download" }, { status: 500 });
  }
}
