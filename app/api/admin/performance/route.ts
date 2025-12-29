import { NextResponse } from 'next/server';
import { getFewShotStats } from '@/lib/analysis/few-shot-learning';
import { generatePromptSuggestions, getPendingSuggestions } from '@/lib/analysis/prompt-suggestions';

export async function GET() {
  try {
    // Get few-shot learning statistics
    const fewShotStats = await getFewShotStats();

    // Get pending prompt suggestions
    const pendingSuggestions = await getPendingSuggestions();

    // Generate new suggestions based on recent rejections
    const generatedSuggestions = await generatePromptSuggestions();

    return NextResponse.json({
      fewShot: {
        enabled: true, // Could be made configurable
        totalExamples: fewShotStats.totalExamples,
        byEventType: fewShotStats.byEventType,
        exemplaryCount: fewShotStats.exemplaryCount,
        recentExamples: fewShotStats.recentExamples,
      },
      promptSuggestions: {
        pending: pendingSuggestions,
        generated: generatedSuggestions,
      },
      config: {
        temperature: 0.2,
        chainOfThought: true,
        fewShotMaxPerType: 5,
      },
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
