import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import minioClient from "@/lib/minio";

export const maxDuration = 120;

const BUCKET_NAME = process.env.MINIO_BUCKET || "character-sheets";

/**
 * GET /api/debug/minio-speed
 * Test MinIO download speed from within the pod
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find a large file to test with
    console.log("[MINIO-SPEED] Listing objects to find a large file...");
    const objectsStream = minioClient.listObjects(BUCKET_NAME, "", true);

    let testFile: { name: string; size: number } | null = null;

    for await (const obj of objectsStream) {
      if (obj.size && obj.size > 50 * 1024 * 1024) {
        // Find file > 50MB
        testFile = { name: obj.name, size: obj.size };
        break;
      }
    }

    if (!testFile) {
      // Try to find any file > 10MB
      const objectsStream2 = minioClient.listObjects(BUCKET_NAME, "", true);
      for await (const obj of objectsStream2) {
        if (obj.size && obj.size > 10 * 1024 * 1024) {
          testFile = { name: obj.name, size: obj.size };
          break;
        }
      }
    }

    if (!testFile) {
      return NextResponse.json(
        {
          error: "No large file found for testing",
          suggestion: "Upload a file > 10MB first",
        },
        { status: 404 },
      );
    }

    console.log(
      `[MINIO-SPEED] Testing with file: ${testFile.name} (${(testFile.size / 1024 / 1024).toFixed(2)} MB)`,
    );

    // Test download speed
    const startTime = Date.now();
    const stream = await minioClient.getObject(BUCKET_NAME, testFile.name);

    let bytesDownloaded = 0;
    let chunkCount = 0;

    for await (const chunk of stream) {
      bytesDownloaded += chunk.length;
      chunkCount++;
    }

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const speedMBps = bytesDownloaded / 1024 / 1024 / elapsedSeconds;
    const speedMbps = speedMBps * 8;

    const result = {
      file: testFile.name,
      fileSizeMB: (testFile.size / 1024 / 1024).toFixed(2),
      downloadedMB: (bytesDownloaded / 1024 / 1024).toFixed(2),
      elapsedSeconds: elapsedSeconds.toFixed(2),
      speedMBps: speedMBps.toFixed(2),
      speedMbps: speedMbps.toFixed(2),
      chunkCount,
      avgChunkSizeKB: (bytesDownloaded / chunkCount / 1024).toFixed(2),
    };

    console.log(`[MINIO-SPEED] Result:`, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[MINIO-SPEED] Error:", error);
    return NextResponse.json(
      {
        error: "Speed test failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
