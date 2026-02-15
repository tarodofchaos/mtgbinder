import nodemailer from 'nodemailer';
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
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    logger.warn('SMTP credentials not configured. Email will not be sent.');
    logger.info(`[SIMULATED EMAIL] To: ${email}, Link: ${resetUrl}`);
    return;
  }

  try {
    logger.info({ host: config.smtp.host, user: config.smtp.user }, 'Attempting to send email via SMTP');
    
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
      to: email,
      subject: 'Reset Your Bring the Binder Password',
      text: `Hi ${displayName}, you requested a password reset. Click here to reset it: ${resetUrl}`,
      html: `
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
    });

    logger.info({ messageId: info.messageId }, `Password reset email sent to ${email} via SMTP`);
  } catch (error) {
    logger.error(error as any, 'Failed to send password reset email via SMTP');
  }
}
