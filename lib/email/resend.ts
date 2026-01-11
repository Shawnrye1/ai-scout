import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
const resend = new Proxy({} as Resend, {
  get(_, prop) { return getResend()[prop as keyof Resend]; }
});

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AI Scout <noreply@aiscout.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const BRAND_COLOR = '#0f2d52';

// Shared email wrapper with AI Scout branding
function emailWrapper(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background-color: ${BRAND_COLOR}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="16" r="4" stroke="white" stroke-width="2" fill="none"/>
            <path d="M12 28L20 20L28 28" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="28" r="2" fill="white"/>
            <circle cx="28" cy="28" r="2" fill="white"/>
          </svg>
        </div>
        <span style="font-size: 24px; font-weight: bold; color: ${BRAND_COLOR};">AI Scout</span>
      </div>
    </div>

    <!-- Content Card -->
    <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">AI Scout - AI-Powered Sports Scouting</p>
      <p style="margin: 0;">
        <a href="${APP_URL}" style="color: ${BRAND_COLOR}; text-decoration: none;">Visit AI Scout</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

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

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string | string[];
  subject: string;
  body: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: emailWrapper(body),
  });
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const displayName = name || 'Coach';
  return sendEmail({
    to: email,
    subject: 'Welcome to AI Scout!',
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Welcome, ${displayName}!</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your AI Scout account is ready. You can now upload game film and get AI-powered scouting reports for every player on the field.
      </p>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0;">Here's what you can do:</h3>
        <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Upload game film for AI analysis</li>
          <li>Get detailed scouting reports for every player</li>
          <li>Track player performance across games</li>
          <li>View team tendencies and patterns</li>
        </ul>
      </div>

      <div style="text-align: center;">
        ${button('Go to Dashboard', `${APP_URL}/home`)}
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        Questions? Just reply to this email - we're here to help.
      </p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: 'Reset your AI Scout password',
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Reset Your Password</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        We received a request to reset your password. Click the button below to choose a new one.
      </p>

      <div style="text-align: center;">
        ${button('Reset Password', resetUrl)}
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    `,
  });
}

export async function sendVerificationEmail(email: string, verificationToken: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
  return sendEmail({
    to: email,
    subject: 'Verify your AI Scout email',
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Verify Your Email</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Please verify your email address to complete your AI Scout account setup.
      </p>

      <div style="text-align: center;">
        ${button('Verify Email', verifyUrl)}
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        This link expires in 24 hours.
      </p>
    `,
  });
}

export async function sendProcessingCompleteEmail(
  email: string,
  gameName: string,
  gameId: string,
  stats: { players: number; plays: number }
) {
  const gameUrl = `${APP_URL}/game/${gameId}`;
  return sendEmail({
    to: email,
    subject: `Analysis Complete: ${gameName}`,
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Your Game Analysis is Ready!</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        We've finished analyzing <strong>${gameName}</strong>. Your scouting reports are ready to view.
      </p>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div>
            <div style="font-size: 32px; font-weight: bold; color: ${BRAND_COLOR};">${stats.players}</div>
            <div style="font-size: 14px; color: #6b7280;">Players Detected</div>
          </div>
          <div>
            <div style="font-size: 32px; font-weight: bold; color: ${BRAND_COLOR};">${stats.plays}</div>
            <div style="font-size: 14px; color: #6b7280;">Plays Analyzed</div>
          </div>
        </div>
      </div>

      <div style="text-align: center;">
        ${button('View Analysis', gameUrl)}
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        The analysis includes player scouting reports, team tendencies, and key moments from the game.
      </p>
    `,
  });
}

export async function sendProcessingFailedEmail(email: string, gameName: string, error: string) {
  return sendEmail({
    to: email,
    subject: `Processing Failed: ${gameName}`,
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Processing Issue</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        We encountered an issue while analyzing <strong>${gameName}</strong>.
      </p>

      <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #ef4444;">
        <p style="color: #991b1b; font-size: 14px; margin: 0;">
          ${error}
        </p>
      </div>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        You can try uploading the video again, or contact support if the issue persists.
      </p>

      <div style="text-align: center;">
        ${button('Upload Again', `${APP_URL}/games/new`)}
      </div>
    `,
  });
}

export async function sendInvitationEmail(email: string, teamName: string, inviterName: string, inviteId: number) {
  const signUpUrl = `${APP_URL}/sign-up?inviteId=${inviteId}`;
  return sendEmail({
    to: email,
    subject: `You've been invited to join ${teamName} on AI Scout`,
    body: `
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">You're Invited!</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        ${inviterName} has invited you to join <strong>${teamName}</strong> on AI Scout.
      </p>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0;">What is AI Scout?</h3>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
          AI Scout analyzes game film and generates detailed scouting reports for every player. Upload video, get insights.
        </p>
      </div>

      <div style="text-align: center;">
        ${button('Accept Invitation', signUpUrl)}
      </div>
    `,
  });
}

export { resend };
