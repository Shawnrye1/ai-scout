import Anthropic from "@anthropic-ai/sdk";

// Lazy initialization to avoid build-time errors
let _anthropic: Anthropic | null = null;

export const anthropic = new Proxy({} as Anthropic, {
  get(_, prop) {
    if (!_anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not set");
      }
      _anthropic = new Anthropic({ apiKey });
    }
    return (_anthropic as any)[prop];
  },
});

export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export const MODELS = {
  FAST: "claude-sonnet-4-20250514",
  SMART: "claude-sonnet-4-20250514",
  BEST: "claude-opus-4-20250514",
} as const;
