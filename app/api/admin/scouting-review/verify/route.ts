import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import { scoutingReviewQueue } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  saveVerifiedScoutingObservation,
  completeScoutingReview,
  type ScoutingObservationType,
} from "@/lib/analysis/scouting-few-shot";

interface VerifyRequest {
  reviewId: string;
  observations: Array<{
    observationType: ScoutingObservationType;
    originalValue: string;
    verifiedValue: string;
    wasCorrection: boolean;
    notes?: string;
  }>;
  markAsExemplary?: boolean;
}

/**
 * POST /api/admin/scouting-review/verify
 *
 * Verify scouting observations for a player.
 * Each observation can be confirmed (same value) or corrected (different value).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyRequest;
    const { reviewId, observations, markAsExemplary } = body;

    if (!reviewId || !observations || observations.length === 0) {
      return NextResponse.json(
        { error: "Missing reviewId or observations" },
        { status: 400 },
      );
    }

    // Get the review record
    const [review] = await db
      .select()
      .from(scoutingReviewQueue)
      .where(eq(scoutingReviewQueue.id, reviewId))
      .limit(1);

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Save each observation as a verified example
    const quality = markAsExemplary ? "exemplary" : "standard";
    let savedCount = 0;
    let correctionCount = 0;

    for (const obs of observations) {
      try {
        await saveVerifiedScoutingObservation(
          review.gameId,
          {
            detectedPlayerId: review.detectedPlayerId || undefined,
            team: review.team as "home" | "away",
            jerseyNumber: review.jerseyNumber || undefined,
            observationType: obs.observationType,
            originalValue: obs.originalValue,
            verifiedValue: obs.verifiedValue,
            wasCorrection: obs.wasCorrection,
            notes: obs.notes,
          },
          "admin",
          quality as "standard" | "exemplary",
        );
        savedCount++;
        if (obs.wasCorrection) {
          correctionCount++;
        }
      } catch (e) {
        console.error(`Failed to save observation ${obs.observationType}:`, e);
      }
    }

    // Mark the review as completed
    await completeScoutingReview(reviewId, "admin");

    return NextResponse.json({
      success: true,
      savedObservations: savedCount,
      corrections: correctionCount,
      message: `Saved ${savedCount} observations (${correctionCount} corrections)`,
    });
  } catch (error) {
    console.error("Error verifying scouting observations:", error);
    return NextResponse.json(
      { error: "Failed to verify scouting observations" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/scouting-review/verify
 *
 * Skip a scouting review (don't verify, just remove from queue)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("reviewId");

    if (!reviewId) {
      return NextResponse.json({ error: "Missing reviewId" }, { status: 400 });
    }

    // Mark as skipped
    await db
      .update(scoutingReviewQueue)
      .set({
        status: "skipped",
        reviewedAt: new Date(),
        reviewedBy: "admin",
      })
      .where(eq(scoutingReviewQueue.id, reviewId));

    return NextResponse.json({
      success: true,
      message: "Review skipped",
    });
  } catch (error) {
    console.error("Error skipping scouting review:", error);
    return NextResponse.json(
      { error: "Failed to skip scouting review" },
      { status: 500 },
    );
  }
}
