import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { document } from "@/lib/db/schema";
import { downloadFile } from "@/lib/minio";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";

/**
 * GET /api/documents/[documentId]/pdf
 * Download a document PDF
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;

    // Get the document
    const doc = await db.select().from(document).where(eq(document.id, documentId));

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Download the file from MinIO
    const fileBuffer = await downloadFile(doc[0].pdfUrl);

    // Load the PDF and set its title metadata
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const documentTitle = doc[0].title || doc[0].fileName.replace(".pdf", "");
    const cleanFileName = `${documentTitle}.pdf`;
    pdfDoc.setTitle(documentTitle);

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // Return the PDF file with proper headers
    const uint8Array = new Uint8Array(modifiedPdfBytes);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${cleanFileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
}
