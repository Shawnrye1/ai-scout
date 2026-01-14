import { Inngest } from "inngest";

// Create the Inngest client
export const inngest = new Inngest({
  id: "ai-scout",
});

// Define event types for type safety
export type Events = {
  "game/uploaded": {
    data: {
      gameId: string;
      userId: string;
      teamId: string;
      videoUrl: string;
      sport: "basketball" | "football";
    };
  };
  "game/analysis.started": {
    data: {
      gameId: string;
      userId: string;
    };
  };
  "game/analysis.progress": {
    data: {
      gameId: string;
      progress: number;
      message: string;
    };
  };
  "game/analysis.completed": {
    data: {
      gameId: string;
      userId: string;
      playerCount: number;
    };
  };
  "game/analysis.failed": {
    data: {
      gameId: string;
      userId: string;
      error: string;
      willRetry: boolean;
    };
  };
};
