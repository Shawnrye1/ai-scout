/**
 * Modal.com client for triggering video processing
 */

const MODAL_ENDPOINT = process.env.MODAL_ENDPOINT || '';
const MODAL_WEBHOOK_SECRET = process.env.MODAL_WEBHOOK_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

interface ProcessingConfig {
  gameId: string;
  videoUrl: string;
  sport?: string;
}

/**
 * Trigger video processing on Modal.com
 */
export async function triggerModalProcessing(config: ProcessingConfig): Promise<void> {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL}/api/webhooks/modal`;

  const payload = {
    game_id: config.gameId,
    video_url: config.videoUrl,
    webhook_url: webhookUrl,
    webhook_secret: MODAL_WEBHOOK_SECRET,
    sport: config.sport || null,
    anthropic_api_key: ANTHROPIC_API_KEY,
  };

  // If Modal endpoint is not configured, skip (for development)
  if (!MODAL_ENDPOINT) {
    console.log('Modal endpoint not configured, skipping processing trigger');
    console.log('Would send payload:', { ...payload, anthropic_api_key: '***' });
    return;
  }

  const response = await fetch(MODAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger Modal processing: ${error}`);
  }
}

/**
 * Check the status of a processing job
 */
export async function getProcessingStatus(gameId: string): Promise<{
  status: string;
  progress: number;
  message?: string;
} | null> {
  // This would query Modal for job status
  // For now, we rely on webhook updates
  return null;
}

/**
 * Retry a failed processing job
 */
export async function retryProcessing(gameId: string, videoUrl: string): Promise<void> {
  return triggerModalProcessing({ gameId, videoUrl });
}
