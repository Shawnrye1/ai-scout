import 'dotenv/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const key = "games/7d7ecb07-3557-4c13-9968-f0b951fa434c/video.mp4";
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;
const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT!;

async function test() {
  console.log("Bucket:", BUCKET);
  console.log("Key:", key);
  console.log("Endpoint:", endpoint);
  console.log("");

  // Try with forcePathStyle
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
    },
    forcePathStyle: true,  // Force path style URLs
  });

  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    console.log("Presigned URL (forcePathStyle):");
    console.log(url.substring(0, 150) + "...");

    // Test the URL
    const resp = await fetch(url, { method: 'HEAD' });
    console.log("Status:", resp.status);
    console.log("Content-Length:", resp.headers.get('content-length'));

    if (resp.status === 200) {
      console.log("\nSUCCESS!");
    } else {
      console.log("\nFailed. Response body preview:");
      const text = await resp.text();
      console.log(text.substring(0, 500));
    }
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

test().catch(console.error);
