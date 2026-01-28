import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { document } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";

/**
 * GET /api/documents/[documentId]/pdf
 * Stream a document PDF from MinIO or return HTML viewer with custom title
 * Optimized for large files (100-600MB) with minimal memory usage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    // Get the document
    const doc = await db.select().from(document).where(eq(document.id, documentId));

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const documentTitle = doc[0].title || doc[0].fileName.replace(".pdf", "");
    const fileSize = doc[0].fileSize;

    // Encode filename for HTTP headers (RFC 5987)
    const safeAsciiFilename =
      documentTitle
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/["\\]/g, "")
        .trim() || "document";

    const cleanFileName = `${safeAsciiFilename}.pdf`;
    const encodedFilename = encodeURIComponent(documentTitle);

    // Check request type
    const raw = request.nextUrl.searchParams.get("raw") === "true";
    const directDownload = request.nextUrl.searchParams.get("direct") === "true";

    if (raw || directDownload) {
      const { default: minioClient } = await import("@/lib/minio");
      const BUCKET_NAME = process.env.MINIO_BUCKET || "character-sheets";

      // Check if client supports range requests
      const range = request.headers.get("range");

      // For large files (>50MB), optimize for streaming performance
      const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB
      const isLargeFile = fileSize > LARGE_FILE_THRESHOLD;

      // Handle range requests for large files (enables streaming/seeking in PDF viewers)
      if (range && isLargeFile) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10) || 0;
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        // Validate range request
        if (start >= fileSize || end >= fileSize || start > end) {
          return NextResponse.json({ error: "Invalid range" }, { status: 416 });
        }

        try {
          // Use MinIO's getPartialObject for efficient range requests
          const stream = await minioClient.getPartialObject(
            BUCKET_NAME,
            doc[0].pdfUrl,
            start,
            chunksize,
          );

          const readableStream = new ReadableStream({
            start(controller) {
              stream.on("data", (chunk: Buffer) => {
                controller.enqueue(new Uint8Array(chunk));
              });
              stream.on("end", () => {
                controller.close();
              });
              stream.on("error", (error) => {
                console.error("Stream error:", error);
                controller.error(error);
              });
            },
            cancel() {
              stream.destroy();
            },
          });

          return new NextResponse(readableStream, {
            status: 206, // Partial Content
            headers: {
              "Content-Type": "application/pdf",
              "Content-Length": chunksize.toString(),
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Content-Disposition": directDownload
                ? `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`
                : `inline; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`,
              "Cache-Control": "private, max-age=3600",
            },
          });
        } catch (rangeError) {
          console.warn("Range request failed, falling back to full stream:", rangeError);
          // Fall through to regular streaming
        }
      }

      // For small files, try metadata modification
      if (!isLargeFile) {
        try {
          const stream = await minioClient.getObject(BUCKET_NAME, doc[0].pdfUrl);
          const chunks: Buffer[] = [];

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout reading PDF"));
            }, 30000); // 30 second timeout

            stream.on("data", (chunk: Buffer) => {
              chunks.push(chunk);
            });
            stream.on("end", () => {
              clearTimeout(timeout);
              resolve();
            });
            stream.on("error", (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          const pdfBuffer = Buffer.concat(chunks);

          // Try to modify metadata
          let modifiedPdfBytes: Uint8Array;
          try {
            const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
            pdfDoc.setTitle(documentTitle);
            modifiedPdfBytes = await pdfDoc.save();
          } catch (pdfError) {
            console.warn(`Could not modify PDF metadata for ${documentId}:`, pdfError);
            modifiedPdfBytes = new Uint8Array(pdfBuffer);
          }

          const readableStream = new ReadableStream({
            start(controller) {
              controller.enqueue(modifiedPdfBytes);
              controller.close();
            },
          });

          return new NextResponse(readableStream, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Length": modifiedPdfBytes.length.toString(),
              "Accept-Ranges": "bytes",
              "Content-Disposition": directDownload
                ? `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`
                : `inline; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`,
              "Cache-Control": "private, max-age=3600",
            },
          });
        } catch (error) {
          console.warn("Small file processing failed, falling back to streaming:", error);
          // Fall through to streaming
        }
      }

      // Optimized streaming for large files - minimal memory usage
      try {
        const stream = await minioClient.getObject(BUCKET_NAME, doc[0].pdfUrl);

        const readableStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk: Buffer) => {
              // Process chunks immediately without buffering
              controller.enqueue(new Uint8Array(chunk));
            });
            stream.on("end", () => {
              controller.close();
            });
            stream.on("error", (error) => {
              console.error("Stream error:", error);
              controller.error(error);
            });
          },
          cancel() {
            // Clean up resources when client disconnects
            stream.destroy();
          },
        });

        return new NextResponse(readableStream, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Length": fileSize.toString(),
            "Accept-Ranges": "bytes", // Enable range request support
            "Content-Disposition": directDownload
              ? `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`
              : `inline; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`,
            "Cache-Control": "private, max-age=3600",
            // Performance headers
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
          },
        });
      } catch (streamError) {
        console.error("Streaming failed:", streamError);
        return NextResponse.json({ error: "Failed to stream document" }, { status: 500 });
      }
    }

    // For standalone views (opening in new tab), return HTML with custom title
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <iframe src="/api/documents/${documentId}/pdf?raw=true#toolbar=1&view=FitV" title="${documentTitle.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"></iframe>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
}
