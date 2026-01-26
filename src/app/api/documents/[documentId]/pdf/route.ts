import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { document } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";

/**
 * GET /api/documents/[documentId]/pdf
 * Stream a document PDF from MinIO or return HTML viewer with custom title
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;

    // Get the document
    const doc = await db.select().from(document).where(eq(document.id, documentId));

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const documentTitle = doc[0].title || doc[0].fileName.replace(".pdf", "");

    // Encode filename for HTTP headers (RFC 5987)
    // Remove or replace problematic characters for ASCII fallback
    const safeAsciiFilename =
      documentTitle
        .replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
        .replace(/["\\]/g, "") // Remove quotes and backslashes
        .trim() || "document";

    const cleanFileName = `${safeAsciiFilename}.pdf`;

    // For modern browsers, use RFC 5987 encoding with UTF-8
    const encodedFilename = encodeURIComponent(documentTitle);

    // Check if this is a raw PDF request (for embedding or direct download)
    const raw = request.nextUrl.searchParams.get("raw") === "true";
    const directDownload = request.nextUrl.searchParams.get("direct") === "true";

    // For embedded views (like in dialogs), serve the PDF with proper Content-Disposition
    // This way the browser's PDF viewer will show the correct filename
    if (raw || directDownload) {
      // Stream the raw PDF file
      const { default: minioClient } = await import("@/lib/minio");
      const BUCKET_NAME = process.env.MINIO_BUCKET || "character-sheets";

      const stream = await minioClient.getObject(BUCKET_NAME, doc[0].pdfUrl);

      // Size threshold: only modify PDFs smaller than 50MB to avoid performance issues
      const MAX_SIZE_FOR_METADATA_MODIFICATION = 50 * 1024 * 1024; // 50MB
      const shouldModifyMetadata = doc[0].fileSize < MAX_SIZE_FOR_METADATA_MODIFICATION;

      if (shouldModifyMetadata) {
        // Download the entire PDF to modify metadata (only for small files)
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          stream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });
          stream.on("end", resolve);
          stream.on("error", reject);
        });

        const pdfBuffer = Buffer.concat(chunks);

        // Try to load and modify the PDF metadata
        let modifiedPdfBytes: Uint8Array;
        try {
          // Load the PDF with ignoreEncryption to handle encrypted PDFs
          const pdfDoc = await PDFDocument.load(pdfBuffer, {
            ignoreEncryption: true,
          });

          // Set the title metadata
          pdfDoc.setTitle(documentTitle);

          // Save the modified PDF
          modifiedPdfBytes = await pdfDoc.save();
        } catch (pdfError) {
          // If PDF modification fails, use the original PDF
          console.warn(`Could not modify PDF metadata for ${documentId}:`, pdfError);
          modifiedPdfBytes = new Uint8Array(pdfBuffer);
        }

        // Create a ReadableStream from the modified PDF
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
            // Use RFC 5987 encoding for proper Unicode support in filenames
            "Content-Disposition": directDownload
              ? `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`
              : `inline; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`,
            "Cache-Control": "private, max-age=3600",
          },
        });
      }

      // For large files, stream directly without metadata modification for better performance
      const readableStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          stream.on("end", () => {
            controller.close();
          });
          stream.on("error", (error) => {
            controller.error(error);
          });
        },
      });

      return new NextResponse(readableStream, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          // Use RFC 5987 encoding for proper Unicode support in filenames
          "Content-Disposition": directDownload
            ? `attachment; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`
            : `inline; filename="${cleanFileName}"; filename*=UTF-8''${encodedFilename}.pdf`,
          "Cache-Control": "private, max-age=3600",
        },
      });
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
