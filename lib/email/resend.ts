import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AI Scout <noreply@aiscout.com>';

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
    html: body,
  });
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const displayName = name || 'Coach';
  return sendEmail({
    to: email,
    subject: 'Welcome to AI Scout!',
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome, ${displayName}!</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Your AI Scout account is ready. You can now upload game film and get AI-powered scouting reports for every player.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Go to Dashboard
        </a>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 32px;">
          If you have any questions, just reply to this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: 'Reset your password',
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Reset Your Password</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Reset Password
        </a>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 32px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email: string, verificationToken: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;
  return sendEmail({
    to: email,
    subject: 'Verify your email address',
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Verify Your Email</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Please verify your email address by clicking the button below.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Verify Email
        </a>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 32px;">
          This link expires in 24 hours.
        </p>
      </div>
    `,
  });
}

export async function sendProcessingCompleteEmail(email: string, gameName: string, gameId: string) {
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL}/game/${gameId}`;
  return sendEmail({
    to: email,
    subject: `Analysis Complete: ${gameName}`,
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Your Game Analysis is Ready!</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          We've finished analyzing <strong>${gameName}</strong>. Your scouting reports are ready to view.
        </p>
        <a href="${gameUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Analysis
        </a>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 32px;">
          The analysis includes player scouting reports, team tendencies, and key moments from the game.
        </p>
      </div>
    `,
  });
}

export { resend };
