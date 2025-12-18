import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

export async function getUploadPresignedUrl(key: string, contentType: string, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getDownloadPresignedUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return s3Client.send(command);
}

export function getPublicUrl(key: string) {
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${key}`;
  }
  // Fallback to presigned URL if no public URL configured
  return getDownloadPresignedUrl(key);
}

export function generateVideoKey(gameId: string, filename: string) {
  const ext = filename.split('.').pop() || 'mp4';
  return `games/${gameId}/video.${ext}`;
}

export function generateThumbnailKey(gameId: string, index = 0) {
  return `games/${gameId}/thumbnails/thumb_${index}.jpg`;
}

export function generateClipKey(gameId: string, playerId: string, momentId: string) {
  return `games/${gameId}/clips/${playerId}/${momentId}.mp4`;
}

export { s3Client, BUCKET };
