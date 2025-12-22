import 'dotenv/config';
import { S3Client, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;

async function check() {
  const key = "games/7d7ecb07-3557-4c13-9968-f0b951fa434c/video.mp4";

  console.log("Bucket:", BUCKET);
  console.log("Endpoint:", process.env.CLOUDFLARE_R2_ENDPOINT);
  console.log("Checking key:", key);

  // Try to get object metadata
  try {
    const headCmd = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    const result = await s3Client.send(headCmd);
    console.log("\nFile exists!");
    console.log("Size:", result.ContentLength, "bytes");
    console.log("Content-Type:", result.ContentType);
    console.log("Last Modified:", result.LastModified);
  } catch (e: any) {
    console.log("\nFile check error:", e.name, e.message);
  }

  // List all files in the game folder
  console.log("\nListing files in games/7d7ecb07-3557-4c13-9968-f0b951fa434c/:");
  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "games/7d7ecb07-3557-4c13-9968-f0b951fa434c/",
    });
    const result = await s3Client.send(listCmd);
    if (result.Contents && result.Contents.length > 0) {
      for (const obj of result.Contents) {
        console.log("-", obj.Key, "(", obj.Size, "bytes )");
      }
    } else {
      console.log("No files found in this prefix");
    }
  } catch (e: any) {
    console.log("List error:", e.name, e.message);
  }
}

check().catch(console.error);
