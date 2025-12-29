import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    forcePathStyle: true,  // Required for R2 presigned URLs
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
    },
  });

  const clipKey = process.argv[2] || 'clips/44704dde-b37d-4be6-a8f6-1201d982b0bb/19a61404-7392-4e26-88c2-ff4ba38e276e.mp4';

  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET || 'aiscoutvideos',
    Key: clipKey,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

  // Fix URL to use R2 endpoint instead of AWS S3
  const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || '';
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || 'aiscoutvideos';

  // Replace the AWS-style URL with R2 endpoint
  const fixedUrl = url.replace(
    /https:\/\/[^/]+\/(aiscoutvideos\/)?/,
    `${r2Endpoint}/${bucket}/`
  );

  console.log(fixedUrl);
}

main();
