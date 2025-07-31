// R2 Storage interface for Deno
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "https://deno.land/x/aws_sdk@v3.4.1.0/client-s3/mod.ts";
import { getSignedUrl } from "https://deno.land/x/aws_sdk@v3.4.1.0/s3-request-presigner/mod.ts";

const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID") || "771e467bc26f111ecfa799d97da1d2ea";
const R2_ACCESS_KEY = Deno.env.get("R2_ACCESS_KEY") || "23c6f2465ed57fdbd543bfc63f87d527";
const R2_SECRET_KEY = Deno.env.get("R2_SECRET_KEY") || "a846139eb282b73f862f5cb0be16b3124de64181100186e89e69d061243c9105";
const R2_BUCKET = Deno.env.get("R2_BUCKET") || "znapfile-production";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export interface UploadResult {
  id: string;
  key: string;
  url: string;
  size: number;
}

export async function uploadFile(
  fileData: Uint8Array,
  filename: string,
  contentType: string,
  userId?: string
): Promise<UploadResult> {
  const id = crypto.randomUUID();
  const key = userId ? `${userId}/${id}/${filename}` : `anonymous/${id}/${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fileData,
    ContentType: contentType,
    Metadata: {
      uploadId: id,
      userId: userId || "anonymous",
      uploadDate: new Date().toISOString(),
    },
  });
  
  await s3Client.send(command);
  
  // Generate presigned URL for download (24 hours)
  const url = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  }), { expiresIn: 86400 });
  
  return {
    id,
    key,
    url,
    size: fileData.length,
  };
}

export async function getFileUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  
  await s3Client.send(command);
}

export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}