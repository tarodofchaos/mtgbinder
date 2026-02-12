import Mailjet from 'node-mailjet';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

/**
 * Sends a password reset email to the user.
 * 
 * @param email - User's email address
 * @param displayName - User's display name
 * @param resetUrl - The URL the user needs to click to reset their password
 */
export async function sendPasswordResetEmail(
  email: string,
  displayName: string,
  resetUrl: string
): Promise<void> {
  if (!config.mailjet.apiKey || !config.mailjet.apiSecret) {
    logger.warn('Mailjet credentials not configured. Email will not be sent.');
    logger.info(`[SIMULATED EMAIL] To: ${email}, Link: ${resetUrl}`);
    return;
  }

  try {
    const mailjet = new Mailjet({
      apiKey: config.mailjet.apiKey,
      apiSecret: config.mailjet.apiSecret,
    });

    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: config.mailjet.fromEmail,
            Name: config.mailjet.fromName,
          },
          To: [
            {
              Email: email,
              Name: displayName,
            },
          ],
          Subject: 'Reset Your Bring the Binder Password',
          TextPart: `Hi ${displayName}, you requested a password reset. Click here to reset it: ${resetUrl}`,
          HTMLPart: `
            <h3>Hi ${displayName},</h3>
            <p>We received a request to reset your password for your Bring the Binder account.</p>
            <p>Click the button below to choose a new password. This link will expire in 1 hour.</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #3f51b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <hr />
            <p style="font-size: 12px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br />
              <a href="${resetUrl}">${resetUrl}</a>
            </p>
          `,
        },
      ],
    });

    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error(error as any, 'Failed to send password reset email via Mailjet');
    // We don't throw here to avoid failing the forgot-password request if the email fails
    // But in production, you might want more robust error handling
  }
}
