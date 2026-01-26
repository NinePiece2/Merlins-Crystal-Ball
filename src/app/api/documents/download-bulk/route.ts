import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { document } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import archiver from "archiver";
import { Readable } from "stream";

export const maxDuration = 300; // 5 minutes for large downloads

/**
 * POST /api/documents/download-bulk
 * Stream multiple documents as a zip file
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

    // Import minio client for streaming
    const { default: minioClient } = await import("@/lib/minio");
    const BUCKET_NAME = process.env.MINIO_BUCKET || "character-sheets";

    // Create a zip archive with streaming
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Compression level (0-9)
    });

    // Track filenames to avoid duplicates
    const usedFilenames = new Set<string>();

    // Add each document to the archive - must be done before finalizing
    for (const doc of docs) {
      try {
        // Get stream from MinIO
        const stream = await minioClient.getObject(BUCKET_NAME, doc.pdfUrl);

        // Create unique filename
        let filename = `${doc.title || doc.fileName.replace(".pdf", "")}.pdf`;
        let counter = 1;
        while (usedFilenames.has(filename)) {
          filename = `${doc.title || doc.fileName.replace(".pdf", "")}_${counter}.pdf`;
          counter++;
        }
        usedFilenames.add(filename);

        // Append file to archive with streaming
        // Note: archiver will buffer these internally until finalize() is called
        archive.append(stream as Readable, { name: filename });
      } catch (error) {
        console.error(`Error adding document ${doc.id} to archive:`, error);
        // Continue with other files even if one fails
      }
    }

    // Finalize the archive - this triggers the actual zip creation
    // Don't await this, as we want to start streaming immediately
    const finalizePromise = archive.finalize();

    // Handle any finalization errors
    finalizePromise.catch((error) => {
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
        archive.on("error", (error) => {
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
