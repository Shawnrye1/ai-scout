/**
 * Configure CORS on R2 bucket for Label Studio video playback
 *
 * Run with: npx tsx scripts/configure-r2-cors.ts
 */

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;

// CORS configuration for Label Studio video playback
const corsRules = [
  {
    // Allow Label Studio (localhost) to access videos
    AllowedOrigins: [
      'http://localhost:8080',      // Label Studio default
      'http://localhost:3000',      // Next.js dev
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
    ],
    AllowedMethods: ['GET', 'HEAD'] as ('GET' | 'HEAD')[],
    AllowedHeaders: ['*'],
    ExposeHeaders: [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Accept-Ranges',
      'ETag',
      'Cache-Control',
    ],
    MaxAgeSeconds: 3600,
  },
  {
    // Also allow the ngrok URL if configured
    AllowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'https://*.ngrok-free.dev'].filter(Boolean) as string[],
    AllowedMethods: ['GET', 'HEAD'] as ('GET' | 'HEAD')[],
    AllowedHeaders: ['*'],
    ExposeHeaders: [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Accept-Ranges',
      'ETag',
    ],
    MaxAgeSeconds: 3600,
  },
];

async function getCurrentCors() {
  try {
    const command = new GetBucketCorsCommand({ Bucket: BUCKET });
    const response = await s3Client.send(command);
    console.log('Current CORS configuration:');
    console.log(JSON.stringify(response.CORSRules, null, 2));
    return response.CORSRules;
  } catch (error: any) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('No CORS configuration currently set');
      return null;
    }
    throw error;
  }
}

async function setCors() {
  console.log('\nSetting CORS configuration...');
  console.log('Bucket:', BUCKET);
  console.log('Rules:', JSON.stringify(corsRules, null, 2));

  const command = new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: {
      CORSRules: corsRules,
    },
  });

  await s3Client.send(command);
  console.log('\nCORS configuration applied successfully!');
}

async function main() {
  console.log('R2 CORS Configuration Tool\n');
  console.log('='.repeat(50));

  if (!BUCKET || !process.env.CLOUDFLARE_R2_ENDPOINT) {
    console.error('Missing R2 configuration. Check your .env file.');
    process.exit(1);
  }

  // Show current config
  await getCurrentCors();

  // Apply new config
  await setCors();

  // Verify
  console.log('\nVerifying new configuration...');
  await getCurrentCors();

  console.log('\n' + '='.repeat(50));
  console.log('Done! Label Studio should now be able to play videos.');
  console.log('\nNote: If using a custom domain, you may need to purge the cache.');
}

main().catch(console.error);
