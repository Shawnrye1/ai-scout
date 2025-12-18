import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set. AI features will not work.');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export const MODELS = {
  FAST: 'claude-sonnet-4-20250514',
  SMART: 'claude-sonnet-4-20250514',
  BEST: 'claude-opus-4-20250514',
} as const;
