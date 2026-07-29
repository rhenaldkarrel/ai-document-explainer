import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";

export async function uploadDocumentToBlob(file: File): Promise<PutBlobResult> {
  return upload(file.name, file, {
    access: "private",
    handleUploadUrl: "/api/blob-upload",
  });
}
