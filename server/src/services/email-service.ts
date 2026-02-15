import nodemailer from 'nodemailer';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { t } from '../utils/i18n';

/**
 * Sends a password reset email to the user.
 * 
 * @param email - User's email address
 * @param displayName - User's display name
 * @param resetUrl - The URL the user needs to click to reset their password
 * @param locale - The preferred language (e.g., 'en', 'es')
 */
export async function sendPasswordResetEmail(
  email: string,
  displayName: string,
  resetUrl: string,
  locale: string = 'en'
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

    const subject = t('emails.passwordReset.subject', {}, locale);
    const greeting = t('emails.passwordReset.greeting', { displayName }, locale);
    const requestReceived = t('emails.passwordReset.requestReceived', {}, locale);
    const buttonText = t('emails.passwordReset.buttonText', {}, locale);
    const buttonSubtext = t('emails.passwordReset.buttonSubtext', {}, locale);
    const ignoreNote = t('emails.passwordReset.ignoreNote', {}, locale);
    const linkFallback = t('emails.passwordReset.linkFallback', {}, locale);
    const textPart = t('emails.passwordReset.textPart', { displayName, resetUrl }, locale);

    const info = await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
      to: email,
      subject,
      text: textPart,
      html: `
        <h3>${greeting}</h3>
        <p>${requestReceived}</p>
        <p>${buttonSubtext}</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #3f51b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            ${buttonText}
          </a>
        </div>
        <p>${ignoreNote}</p>
        <hr />
        <p style="font-size: 12px; color: #666;">
          ${linkFallback}<br />
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
      `,
    });

    logger.info({ messageId: info.messageId }, `Password reset email sent to ${email} via SMTP`);
  } catch (error) {
    logger.error(error as any, 'Failed to send password reset email via SMTP');
  }
}
