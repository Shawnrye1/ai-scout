import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
    },
  });

  const clipKey = process.argv[2] || 'clips/44704dde-b37d-4be6-a8f6-1201d982b0bb/19a61404-7392-4e26-88c2-ff4ba38e276e.mp4';
  const outputPath = process.argv[3] || '/tmp/test_clip.mp4';

  console.log(`Downloading ${clipKey}...`);

  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET || 'aiscoutvideos',
    Key: clipKey,
  });

  const response = await s3.send(command);

  if (response.Body) {
    const stream = response.Body as Readable;
    const writeStream = fs.createWriteStream(outputPath);
    stream.pipe(writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    console.log(`Downloaded to: ${outputPath}`);
    console.log(`Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  }
}

main().catch(console.error);
