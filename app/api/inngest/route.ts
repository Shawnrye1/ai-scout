import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { analyzeGame } from "@/lib/inngest/functions";

/**
 * Inngest API Route
 *
 * This route serves all Inngest functions and handles:
 * - Function registration with Inngest cloud
 * - Event ingestion
 * - Function execution
 *
 * In development: Functions run locally
 * In production: Functions run on Inngest cloud with retries, observability, etc.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeGame,
    // Add more functions here as needed
  ],
});
