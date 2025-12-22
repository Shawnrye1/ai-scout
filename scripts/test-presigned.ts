import 'dotenv/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Try different endpoint formats
const endpoints = [
  process.env.CLOUDFLARE_R2_ENDPOINT!,
  `https://${process.env.CLOUDFLARE_R2_BUCKET}.${process.env.CLOUDFLARE_R2_ENDPOINT!.replace('https://', '')}`,
];

const key = "games/7d7ecb07-3557-4c13-9968-f0b951fa434c/video.mp4";
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;

async function test() {
  console.log("Bucket:", BUCKET);
  console.log("Key:", key);
  console.log("");

  for (const endpoint of endpoints) {
    console.log("Testing endpoint:", endpoint);

    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
      },
    });

    try {
      const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      console.log("Presigned URL:", url.substring(0, 100) + "...");

      // Test the URL
      const resp = await fetch(url, { method: 'HEAD' });
      console.log("Status:", resp.status);
      if (resp.status === 200) {
        console.log("SUCCESS! This URL works.");
        console.log("\nFull URL:", url);
        break;
      }
    } catch (e: any) {
      console.log("Error:", e.message);
    }
    console.log("");
  }
}

test().catch(console.error);
