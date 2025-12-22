import { NextRequest, NextResponse } from 'next/server';
import { labelStudio } from '@/lib/labelstudio/client';

/**
 * GET /api/admin/labelstudio
 *
 * Check Label Studio connection status and get project info
 */
export async function GET() {
  try {
    // Check if Label Studio is configured
    if (!process.env.LABEL_STUDIO_URL || !process.env.LABEL_STUDIO_API_KEY) {
      return NextResponse.json({
        connected: false,
        error: 'Label Studio not configured. Set LABEL_STUDIO_URL and LABEL_STUDIO_API_KEY.',
      });
    }

    // Try to connect
    const isHealthy = await labelStudio.healthCheck();
    if (!isHealthy) {
      return NextResponse.json({
        connected: false,
        error: 'Cannot connect to Label Studio. Is it running?',
      });
    }

    // Get or create the sports project
    const project = await labelStudio.getOrCreateSportsProject();

    return NextResponse.json({
      connected: true,
      project: {
        id: project.id,
        title: project.title,
        taskCount: project.task_count,
        url: `${process.env.LABEL_STUDIO_URL}/projects/${project.id}`,
      },
    });
  } catch (error) {
    console.error('Label Studio connection error:', error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
