import { sendEmail } from "./resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const BRAND_COLOR = "#0f2d52";

function button(text: string, href: string) {
  return `
    <a href="${href}"
       style="display: inline-block; background-color: ${BRAND_COLOR}; color: white;
              padding: 14px 28px; text-decoration: none; border-radius: 8px;
              font-weight: 600; font-size: 16px; margin: 16px 0;">
      ${text}
    </a>
  `;
}

/**
 * Send email when game analysis is complete and ready to view
 */
export async function sendGameReadyEmail(
  email: string,
  gameId: string,
  playerCount: number
) {
  const gameUrl = `${APP_URL}/game/${gameId}`;

  return sendEmail({
    to: email,
    subject: "Your scouting reports are ready!",
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Analysis Complete!</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Great news! We've finished analyzing your game film. Your scouting reports are ready to view.
      </p>

      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #22c55e;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="font-size: 48px; font-weight: bold; color: #16a34a;">${playerCount}</div>
          <div>
            <div style="font-size: 18px; font-weight: 600; color: #111827;">Players Scouted</div>
            <div style="font-size: 14px; color: #6b7280;">with detailed reports</div>
          </div>
        </div>
      </div>

      <div style="text-align: center;">
        ${button("View Scouting Reports", gameUrl)}
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="color: #4b5563; font-size: 14px; margin: 0;">
          <strong>What's included:</strong> Player grades, strengths & weaknesses,
          key moments, team tendencies, and coaching insights.
        </p>
      </div>
    `,
  });
}

/**
 * Send email when game analysis fails after all retries
 */
export async function sendGameFailedEmail(
  email: string,
  gameId: string,
  errorMessage: string
) {
  const uploadUrl = `${APP_URL}/games/new`;
  const supportEmail = "support@aiscout.com";

  return sendEmail({
    to: email,
    subject: "We hit a snag with your game analysis",
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Analysis Issue</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        We encountered an issue while analyzing your game film. Our team has been notified and is looking into it.
      </p>

      <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #ef4444;">
        <p style="color: #991b1b; font-size: 14px; margin: 0;">
          <strong>Error:</strong> ${errorMessage}
        </p>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0;">What you can try:</h3>
        <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Re-upload the video file</li>
          <li>Try a different video format (MP4 works best)</li>
          <li>Ensure the video is under 5GB</li>
          <li>Check that the video quality is clear enough to see jersey numbers</li>
        </ul>
      </div>

      <div style="text-align: center;">
        ${button("Try Again", uploadUrl)}
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        Still having issues? Contact us at
        <a href="mailto:${supportEmail}" style="color: ${BRAND_COLOR};">${supportEmail}</a>
      </p>
    `,
  });
}

/**
 * Send email when game analysis starts (optional - for long uploads)
 */
export async function sendGameProcessingEmail(email: string, gameId: string) {
  const dashboardUrl = `${APP_URL}/games`;

  return sendEmail({
    to: email,
    subject: "Your game is being analyzed",
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Analysis Started!</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        We've received your game film and started the AI analysis. This typically takes 15-30 minutes.
      </p>

      <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #3b82f6;">
        <p style="color: #1e40af; font-size: 14px; margin: 0;">
          <strong>What's happening:</strong> Our AI is detecting players, reading jersey numbers,
          tracking movements, and generating detailed scouting reports.
        </p>
      </div>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        We'll send you another email when your reports are ready. You can also check the status
        anytime in your dashboard.
      </p>

      <div style="text-align: center;">
        ${button("View Dashboard", dashboardUrl)}
      </div>
    `,
  });
}
