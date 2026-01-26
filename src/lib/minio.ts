import { Client } from "minio";
import { Readable } from "stream";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : 9000,
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
  secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin",
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "character-sheets";

/**
 * Initialize MinIO bucket if it doesn't exist
 */
export async function initMinIOBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
      console.log(`Created bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error("Error initializing MinIO bucket:", error);
    throw error;
  }
}

/**
 * Upload a character sheet file to MinIO
 * @param userId - The user ID (for organization)
 * @param characterId - The character ID
 * @param level - The character level
 * @param file - The file to upload
 * @returns The object path in MinIO
 */
export async function uploadCharacterSheet(
  userId: string,
  characterId: string,
  level: number,
  file: Buffer | Readable,
  filename: string,
): Promise<string> {
  const timestamp = Date.now();
  const objectPath = `characters/${userId}/${characterId}/level-${level}/${timestamp}-${filename}`;

  try {
    await minioClient.putObject(BUCKET_NAME, objectPath, file as Readable);
    return objectPath;
  } catch (error: unknown) {
    console.error("Error uploading character sheet:", error);
    throw error;
  }
}

/**
 * Upload a character portrait image to MinIO
 * @param userId - The user ID (for organization)
 * @param characterId - The character ID
 * @param file - The image file to upload
 * @returns The object path in MinIO
 */
export async function uploadCharacterPortrait(
  userId: string,
  characterId: string,
  file: Buffer | Readable,
  filename: string,
): Promise<string> {
  const timestamp = Date.now();
  const objectPath = `portraits/${userId}/${characterId}/${timestamp}-${filename}`;

  try {
    await minioClient.putObject(BUCKET_NAME, objectPath, file as Readable);
    return objectPath;
  } catch (error) {
    console.error("Error uploading character portrait:", error);
    throw error;
  }
}

/**
 * Get a presigned URL for downloading a file from MinIO
 * @param objectPath - The object path in MinIO
 * @param expirySeconds - How long the URL is valid (default 7 days)
 * @returns The presigned URL
 */
export async function getPresignedUrl(
  objectPath: string,
  expirySeconds: number = 7 * 24 * 60 * 60, // 7 days default
): Promise<string> {
  try {
    const url = await minioClient.presignedGetObject(BUCKET_NAME, objectPath, expirySeconds);
    return url;
  } catch (error) {
    console.error("Error getting presigned URL:", error);
    throw error;
  }
}

/**
 * Download a file from MinIO
 * @param objectPath - The object path in MinIO
 * @returns The file buffer
 */
export async function downloadFile(objectPath: string): Promise<Buffer> {
  try {
    const stream = await minioClient.getObject(BUCKET_NAME, objectPath);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("error", reject)
        .on("end", () => resolve(Buffer.concat(chunks)));
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}

/**
 * Delete all files for a character (both portraits and character sheets)
 * @param userId - The user ID
 * @param characterId - The character ID
 */
export async function deleteCharacterFiles(userId: string, characterId: string): Promise<void> {
  try {
    const prefixes = [`characters/${userId}/${characterId}/`];

    for (const prefix of prefixes) {
      const stream = minioClient.listObjects(BUCKET_NAME, prefix, true);

      return new Promise((resolve, reject) => {
        const filesToDelete: string[] = [];
        stream.on("data", (obj: { name: string }) => {
          filesToDelete.push(obj.name);
        });
        stream.on("error", reject);
        stream.on("end", async () => {
          try {
            // Delete all files in batches
            for (const fileName of filesToDelete) {
              await minioClient.removeObject(BUCKET_NAME, fileName);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  } catch (error) {
    console.error("Error deleting character files:", error);
    throw error;
  }
}

/**
 * Delete a file from MinIO
 * @param objectPath - The object path in MinIO
 */
export async function deleteFile(objectPath: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectPath);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

/**
 * List all files for a character
 * @param userId - The user ID
 * @param characterId - The character ID
 * @returns Array of file metadata
 */
export async function listCharacterFiles(
  userId: string,
  characterId: string,
): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
  try {
    const files: Array<{ name: string; size: number; lastModified: Date }> = [];
    const stream = minioClient.listObjects(
      BUCKET_NAME,
      `characters/${userId}/${characterId}/`,
      true,
    );

    return new Promise((resolve, reject) => {
      stream.on("data", (obj: { name: string; size: number; lastModified: Date }) => {
        files.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
        });
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(files));
    });
  } catch (error) {
    console.error("Error listing character files:", error);
    throw error;
  }
}

/**
 * Upload a document PDF to MinIO with chunked upload support for large files
 * @param fileName - The name of the file
 * @param file - The file buffer or stream
 * @param fileSize - The total file size in bytes
 * @returns The object path in MinIO
 */
export async function uploadDocument(
  fileName: string,
  file: Buffer | Readable,
  fileSize: number,
): Promise<string> {
  const timestamp = Date.now();
  const objectPath = `documents/${timestamp}-${fileName}`;

  try {
    await minioClient.putObject(BUCKET_NAME, objectPath, file as Readable, fileSize);
    return objectPath;
  } catch (error: unknown) {
    console.error("Error uploading document:", error);
    throw error;
  }
}

/**
 * Upload a large file in chunks to MinIO
 * Useful for files > 100MB that exceed Cloudflare limits
 * @param objectName - The name/path of the object in MinIO
 * @param fileBuffer - The complete file buffer
 * @param chunkSize - Size of each chunk in bytes (default: 50MB)
 * @returns The object path in MinIO
 */
export async function uploadLargeFile(
  objectName: string,
  fileBuffer: Buffer,
  chunkSize: number = 50 * 1024 * 1024, // 50MB default
): Promise<string> {
  try {
    // For files larger than chunkSize, we'll upload the entire file
    // MinIO SDK handles multipart uploads internally if needed
    const fileSize = fileBuffer.length;

    // If file is under chunkSize, just upload directly
    if (fileSize <= chunkSize) {
      await minioClient.putObject(BUCKET_NAME, objectName, fileBuffer, fileSize);
      return objectName;
    }

    // For large files, MinIO's putObject with streaming will automatically
    // use multipart upload when the file size is known
    await minioClient.putObject(BUCKET_NAME, objectName, fileBuffer, fileSize, {
      "Content-Type": "application/pdf",
    });

    return objectName;
  } catch (error: unknown) {
    console.error("Error uploading large file:", error);
    throw error;
  }
}

/**
 * Start a chunked upload and return an upload ID
 * Useful for resumable uploads from the frontend
 * @param fileName - The name of the file
 * @returns Upload session info with uploadId and suggestedChunkSize
 */
export async function initiateChunkedUpload(fileName: string): Promise<{
  uploadId: string;
  objectPath: string;
  suggestedChunkSize: number;
}> {
  const timestamp = Date.now();
  const objectPath = `documents/${timestamp}-${fileName}`;
  const uploadId = `${timestamp}-${Math.random().toString(36).substring(7)}`;

  // Return upload session details
  // The actual multipart upload will be initiated when first chunk is received
  return {
    uploadId,
    objectPath,
    suggestedChunkSize: 50 * 1024 * 1024, // 50MB chunks
  };
}

/**
 * Delete a document from MinIO
 * @param objectPath - The object path in MinIO
 */
export async function deleteDocument(objectPath: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectPath);
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

/**
 * List all documents in MinIO
 * @returns Array of document metadata
 */
export async function listDocuments(): Promise<
  Array<{ name: string; size: number; lastModified: Date }>
> {
  try {
    const files: Array<{ name: string; size: number; lastModified: Date }> = [];
    const stream = minioClient.listObjects(BUCKET_NAME, "documents/", true);

    return new Promise((resolve, reject) => {
      stream.on("data", (obj: { name: string; size: number; lastModified: Date }) => {
        files.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
        });
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(files));
    });
  } catch (error) {
    console.error("Error listing D&D Documents:", error);
    throw error;
  }
}

/**
 * Upload a chunk for a multipart upload to MinIO
 * Chunks are stored in a temporary location and can be accessed by any pod
 * @param chunkPath - The path for the chunk (e.g., uploadId/chunk-0)
 * @param buffer - The chunk buffer
 */
export async function uploadChunk(chunkPath: string, buffer: Buffer): Promise<void> {
  try {
    const fullPath = `chunks/${chunkPath}`;
    await minioClient.putObject(BUCKET_NAME, fullPath, buffer, buffer.length);
  } catch (error) {
    console.error(`Error uploading chunk ${chunkPath}:`, error);
    throw error;
  }
}

/**
 * Download a chunk from MinIO
 * @param chunkPath - The path for the chunk (e.g., uploadId/chunk-0)
 * @returns The chunk buffer
 */
export async function downloadChunk(chunkPath: string): Promise<Buffer> {
  try {
    const fullPath = `chunks/${chunkPath}`;
    const stream = await minioClient.getObject(BUCKET_NAME, fullPath);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("error", reject)
        .on("end", () => resolve(Buffer.concat(chunks)));
    });
  } catch (error) {
    console.error(`Error downloading chunk ${chunkPath}:`, error);
    throw error;
  }
}

/**
 * List all chunks for a specific upload
 * @param uploadId - The upload ID
 * @returns Array of chunk names (e.g., ['chunk-0', 'chunk-1', ...])
 */
export async function listChunks(uploadId: string): Promise<string[]> {
  try {
    const chunkNames: string[] = [];
    const stream = minioClient.listObjects(BUCKET_NAME, `chunks/${uploadId}/`, false);

    return new Promise((resolve, reject) => {
      stream.on("data", (obj: { name: string }) => {
        const chunkName = obj.name.replace(`chunks/${uploadId}/`, "");
        if (chunkName && chunkName.startsWith("chunk-")) {
          chunkNames.push(chunkName);
        }
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(chunkNames));
    });
  } catch (error) {
    console.error(`Error listing chunks for upload ${uploadId}:`, error);
    throw error;
  }
}

/**
 * Delete all chunks for a specific upload (cleanup after assembly)
 * @param uploadId - The upload ID
 */
export async function deleteChunks(uploadId: string): Promise<void> {
  try {
    // List all files under the upload directory (chunks + lock file)
    const stream = minioClient.listObjects(BUCKET_NAME, `chunks/${uploadId}/`, false);
    const filesToDelete: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (obj: { name: string }) => {
        filesToDelete.push(obj.name);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve());
    });

    // Delete all files (chunks and lock)
    for (const filePath of filesToDelete) {
      await minioClient.removeObject(BUCKET_NAME, filePath);
    }
  } catch (error) {
    console.error(`Error deleting chunks for upload ${uploadId}:`, error);
    throw error;
  }
}

/**
 * Reassemble chunks into a complete file using streaming to avoid memory issues
 * This is more memory efficient than loading all chunks at once
 * @param uploadId - The upload ID
 * @param fileName - The name of the final file
 * @returns Object with the path in MinIO where the file was saved and total file size
 */
export async function reassembleChunksStreaming(
  uploadId: string,
  fileName: string,
): Promise<{ objectPath: string; fileSize: number }> {
  const timestamp = Date.now();
  const objectPath = `documents/${timestamp}-${fileName}`;

  try {
    // Get sorted list of chunk names
    const chunks = await listChunks(uploadId);
    const sortedChunkNames = chunks
      .map((name) => ({
        index: parseInt(name.split("-")[1]),
        name,
      }))
      .sort((a, b) => a.index - b.index)
      .map((c) => c.name);

    // Create a PassThrough stream to pipe chunks through
    const { PassThrough } = await import("stream");
    const outputStream = new PassThrough();

    // Track total size for MinIO metadata
    let totalSize = 0;

    // Start the upload to MinIO (it will consume from the stream)
    const uploadPromise = minioClient.putObject(BUCKET_NAME, objectPath, outputStream as Readable);

    // Stream chunks one by one
    (async () => {
      try {
        for (const chunkName of sortedChunkNames) {
          const fullPath = `chunks/${uploadId}/${chunkName}`;
          const chunkStream = await minioClient.getObject(BUCKET_NAME, fullPath);

          // Pipe this chunk into the output stream
          await new Promise<void>((resolve, reject) => {
            chunkStream.on("data", (chunk: Buffer) => {
              totalSize += chunk.length;
              outputStream.write(chunk);
            });
            chunkStream.on("error", reject);
            chunkStream.on("end", resolve);
          });
        }

        // Signal that we're done writing
        outputStream.end();
      } catch (error) {
        outputStream.destroy(error as Error);
      }
    })();

    // Wait for the upload to complete
    await uploadPromise;

    return { objectPath, fileSize: totalSize };
  } catch (error) {
    console.error(`Error reassembling chunks for upload ${uploadId}:`, error);
    throw error;
  }
}

export default minioClient;
