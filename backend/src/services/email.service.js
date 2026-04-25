import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { logEvent } from '../utils/logEvent.js';

/**
 * Phase 6: Email Service — Nodemailer Gmail SMTP.
 * All sends are fire-and-forget; failures NEVER propagate to callers.
 */

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('[EmailService] EMAIL_USER or EMAIL_PASS not configured — email sending disabled');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send an email to a single recipient.
 * @param {object} opts
 * @param {string} opts.to         - Recipient email address
 * @param {string} opts.subject    - Email subject line
 * @param {string} opts.body       - Plain text body
 * @param {string} [opts.meetingId]
 * @param {string} [opts.userId]
 */
export async function sendEmail({ to, subject, body, meetingId, userId }) {
  const transporter = createTransporter();

  if (!transporter) {
    await logEvent({
      type: 'ERROR',
      message: `Email skipped for ${to}: credentials not configured`,
      status: 'failed',
      meetingId,
      userId,
      metadata: { to },
    });
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Exora AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: body,
    });

    await logEvent({
      type: 'AI_ACTION',
      message: `Email sent to ${to}`,
      status: 'success',
      meetingId,
      userId,
      metadata: { to, subject },
    });

    logger.info(`[EmailService] Sent to ${to}`, { to, meetingId });
  } catch (err) {
    await logEvent({
      type: 'ERROR',
      message: `Email failed for ${to}: ${err.message}`,
      status: 'failed',
      meetingId,
      userId,
      metadata: { to, error: err.message },
    });

    logger.error(`[EmailService] Failed to send to ${to}`, { error: err.message });
    // Never rethrow — caller must not crash on email failure
  }
}

/**
 * Send emails to multiple recipients concurrently.
 * Each individual failure is logged without blocking others.
 * @param {object} opts
 * @param {Array<{email: string, userId: string}>} opts.recipients
 * @param {string} opts.subject
 * @param {string} opts.body
 * @param {string} [opts.meetingId]
 */
export async function sendBulkEmail({ recipients, subject, body, meetingId }) {
  await Promise.allSettled(
    recipients.map(({ email, userId }) =>
      sendEmail({ to: email, subject, body, meetingId, userId })
    )
  );
}
